const { Client } = require('ssh2');
const fs  = require('fs');
const tar = require('tar');
const os  = require('os');

const HOST     = '72.61.244.31';
const USER     = 'root';
const PASSWORD = 'Rushika@2726';
const REMOTE   = '/opt/wework';
const SKIP     = new Set(['node_modules', '.git', 'dist', 'build', '__pycache__']);

function log(msg) { process.stdout.write(msg + '\n'); }

function runCmd(conn, cmd, timeoutMs = 120000) {
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
      const total = fs.statSync(localPath).size;
      let lastPct = -1;
      sftp.fastPut(localPath, remotePath, {
        step: (done) => {
          const pct = Math.floor((done / total) * 100);
          if (pct !== lastPct && pct % 20 === 0) { process.stdout.write(`\r   Uploading... ${pct}%  `); lastPct = pct; }
        }
      }, err2 => {
        process.stdout.write('\r   Upload done ✓              \n');
        sftp.end();
        err2 ? reject(err2) : resolve();
      });
    });
  });
}

async function buildFrontendArchive() {
  log('📦 Building frontend archive...');
  const out = path.join(os.tmpdir(), 'wework_frontend.tar.gz');
  const base = path.join(__dirname, 'frontend');
  const entries = fs.readdirSync(base).filter(e => !SKIP.has(e) && !e.startsWith('.') && e !== 'node_modules');
  await tar.c({ gzip: true, file: out, cwd: base, portable: true, filter: p => !p.includes('node_modules') }, entries);
  const size = (fs.statSync(out).size / 1024 / 1024).toFixed(1);
  log(`   Frontend archive: ${size} MB`);
  return out;
}

const path = require('path');

async function main() {
  const archive = await buildFrontendArchive();

  log(`\n🔌 Connecting...`);
  const conn = new Client();
  await new Promise((resolve, reject) => {
    conn.on('ready', resolve);
    conn.on('error', reject);
    conn.connect({ host: HOST, port: 22, username: USER, password: PASSWORD, readyTimeout: 30000 });
  });
  log('   Connected ✓');

  log('\n📤 Uploading frontend source...');
  await uploadFile(conn, archive, `${REMOTE}/wework_frontend.tar.gz`);
  try { fs.unlinkSync(archive); } catch {}

  log('\n📂 Replacing frontend source...');
  await runCmd(conn, `cd ${REMOTE}/frontend && tar -xzf ${REMOTE}/wework_frontend.tar.gz && rm -f ${REMOTE}/wework_frontend.tar.gz`);

  log('\n🔨 Rebuilding frontend only (2–3 min)...');
  await runCmd(conn,
    `cd ${REMOTE} && docker compose stop frontend && docker compose rm -f frontend && docker compose up -d --build frontend 2>&1`,
    600000
  );

  log('\n✅ Done!');
  await runCmd(conn, "docker ps --format 'table {{.Names}}\\t{{.Status}}\\t{{.Ports}}'");
  log('\n🌐 App: http://72.61.244.31:8080');
  conn.end();
}

main().catch(err => { log(`\n❌ Failed: ${err.message}`); process.exit(1); });
