const { Client } = require('ssh2');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { HOST, USER, PASSWORD } = require('./deploy.config.local');

function log(msg) { process.stdout.write(msg + '\n'); }

function runCmd(conn, cmd, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let out = '';
      const timer = setTimeout(() => reject(new Error('Timeout')), timeoutMs);
      stream.on('data',        d => { out += d; d.toString().split('\n').filter(Boolean).forEach(l => log('   ' + l)); });
      stream.stderr.on('data', d => { d.toString().split('\n').filter(Boolean).forEach(l => log('   ' + l)); });
      stream.on('close', () => { clearTimeout(timer); resolve(out.trim()); });
    });
  });
}

function uploadFile(conn, localPath, remotePath) {
  return new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) return reject(err);
      sftp.fastPut(localPath, remotePath, {}, err2 => {
        sftp.end();
        err2 ? reject(err2) : resolve();
      });
    });
  });
}

// Write seed script to a temp file (avoids all shell escaping issues)
const seedScript = `
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function seed() {
  const adminHash   = await bcrypt.hash('adminpass',  10);
  const managerHash = await bcrypt.hash('manager123', 10);

  const admin = await prisma.user.upsert({
    where:  { email: 'admin@wework.com' },
    update: { password: adminHash, role: 'ADMIN', name: 'Admin' },
    create: { email: 'admin@wework.com', password: adminHash, role: 'ADMIN', name: 'Admin' }
  });

  const manager = await prisma.user.upsert({
    where:  { email: 'manager@wework.com' },
    update: { password: managerHash, role: 'MANAGER', name: 'Manager' },
    create: { email: 'manager@wework.com', password: managerHash, role: 'MANAGER', name: 'Manager' }
  });

  console.log('Seeded:', admin.email,   admin.role);
  console.log('Seeded:', manager.email, manager.role);
  await prisma.$disconnect();
}

seed().catch(async e => {
  console.error('Seed error:', e.message);
  await prisma.$disconnect();
  process.exit(1);
});
`;

async function main() {
  // Write seed script to temp file
  const tmpFile = path.join(os.tmpdir(), 'wework_seed.js');
  fs.writeFileSync(tmpFile, seedScript);

  log('🔌 Connecting...');
  const conn = new Client();
  await new Promise((resolve, reject) => {
    conn.on('ready', resolve);
    conn.on('error', reject);
    conn.connect({ host: HOST, port: 22, username: USER, password: PASSWORD, readyTimeout: 30000 });
  });
  log('   Connected ✓');

  // Upload seed file to container via host
  log('\n📤 Uploading seed script...');
  await uploadFile(conn, tmpFile, '/tmp/wework_seed.js');
  fs.unlinkSync(tmpFile);

  // Copy into container and run
  log('\n🌱 Copying seed into container and running...');
  await runCmd(conn, 'docker cp /tmp/wework_seed.js wework-backend:/app/seed_run.js');
  await runCmd(conn, 'docker exec wework-backend node /app/seed_run.js', 30000);
  await runCmd(conn, 'docker exec wework-backend rm /app/seed_run.js');

  log('\n✅ Users seeded! Try logging in:');
  log('   http://72.61.244.31:8080');
  log('   admin@wework.com   / adminpass');
  log('   manager@wework.com / manager123');

  conn.end();
}

main().catch(err => { log(`\n❌ Failed: ${err.message}`); process.exit(1); });
