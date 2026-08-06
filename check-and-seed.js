const { Client } = require('ssh2');

const { HOST, USER, PASSWORD } = require('./deploy.config.local');

function log(msg) { process.stdout.write(msg + '\n'); }

function runCmd(conn, cmd, timeoutMs = 60000) {
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

async function main() {
  log('🔌 Connecting...');
  const conn = new Client();
  await new Promise((resolve, reject) => {
    conn.on('ready', resolve);
    conn.on('error', reject);
    conn.connect({ host: HOST, port: 22, username: USER, password: PASSWORD, readyTimeout: 30000 });
  });
  log('   Connected ✓\n');

  log('📋 Backend logs (last 50 lines):');
  await runCmd(conn, 'docker logs wework-backend --tail 50 2>&1');

  log('\n🔍 Checking if users exist in DB:');
  await runCmd(conn, `docker exec wework-backend sh -c "node -e \\"const {PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.user.findMany().then(u=>{console.log('Users:',JSON.stringify(u.map(x=>({id:x.id,email:x.email,role:x.role}))));p.\$disconnect()}).catch(e=>{console.log('Error:',e.message);p.\$disconnect()})\\""`, 30000);

  log('\n🌱 Creating admin and manager users...');
  const seedScript = `
const {PrismaClient}=require('@prisma/client');
const bcrypt=require('bcryptjs');
const p=new PrismaClient();
async function seed(){
  const adminHash=await bcrypt.hash('adminpass',10);
  const mgHash=await bcrypt.hash('manager123',10);

  const admin=await p.user.upsert({
    where:{email:'admin@wework.com'},
    update:{password:adminHash,role:'ADMIN',name:'Admin'},
    create:{email:'admin@wework.com',password:adminHash,role:'ADMIN',name:'Admin'}
  });
  const mgr=await p.user.upsert({
    where:{email:'manager@wework.com'},
    update:{password:mgHash,role:'MANAGER',name:'Manager'},
    create:{email:'manager@wework.com',password:mgHash,role:'MANAGER',name:'Manager'}
  });
  console.log('Created/updated:',admin.email,admin.role);
  console.log('Created/updated:',mgr.email,mgr.role);
  await p.$disconnect();
}
seed().catch(e=>{console.error(e.message);p.$disconnect();});
`;
  const escapedScript = seedScript.replace(/"/g, '\\"').replace(/\n/g, ' ');
  await runCmd(conn, `docker exec wework-backend node -e "${escapedScript}"`, 30000);

  log('\n✅ Done! Try logging in again at http://72.61.244.31:8080');
  conn.end();
}

main().catch(err => { log(`\n❌ Failed: ${err.message}`); process.exit(1); });
