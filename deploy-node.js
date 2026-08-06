const { Client } = require('ssh2');
const fs   = require('fs');
const path = require('path');
const tar  = require('tar');
const os   = require('os');

const { HOST, USER, PASSWORD } = require('./deploy.config.local');
const REMOTE   = '/opt/wework';
const BASE     = __dirname;

const SKIP_PARTS = new Set(['node_modules', '.git', 'dist', 'build', '__pycache__']);

function log(msg) { process.stdout.write(msg + '\n'); }

async function buildArchive() {
  log('📦 Building archive...');
  const out = path.join(os.tmpdir(), 'wework_deploy.tar.gz');

  // Entries to include (top-level items)
  const entries = fs.readdirSync(BASE).filter(e => {
    if (SKIP_PARTS.has(e)) return false;
    if (e.startsWith('.')) return false;
    if (e === 'deploy-node.js' || e === 'deploy.py') return false;
    if (e === 'package.json' || e === 'package-lock.json') return false; // root package, not needed
    if (e === '_deploy.tar.gz') return false;
    return true;
  });

  log(`   Including: ${entries.join(', ')}`);

  await tar.c(
    {
      gzip: true,
      file: out,
      cwd: BASE,
      portable: true,
      filter: (entryPath) => {
        const parts = entryPath.replace(/\\/g, '/').split('/');
        if (parts.some(p => SKIP_PARTS.has(p))) return false;
        const base = parts[parts.length - 1];
        if (base.endsWith('.db')) return false;
        if (base === '.env') return false;
        return true;
      }
    },
    entries
  );

  const size = (fs.statSync(out).size / 1024 / 1024).toFixed(1);
  log(`   Archive ready: ${size} MB`);
  return out;
}

function runCmd(conn, cmd, timeoutMs = 60000) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let out = '';
      const timer = setTimeout(() => reject(new Error('Timed out: ' + cmd.slice(0, 40))), timeoutMs);
      stream.on('data',        d => { out += d; d.toString().split('\n').filter(Boolean).forEach(l => log('   ' + l)); });
      stream.stderr.on('data', d => { d.toString().split('\n').filter(Boolean).forEach(l => log('   ' + l)); });
      stream.on('close', ()  => { clearTimeout(timer); resolve(out.trim()); });
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
          if (pct !== lastPct && pct % 10 === 0) { process.stdout.write(`\r   Uploading... ${pct}%  `); lastPct = pct; }
        }
      }, err2 => {
        process.stdout.write('\r   Upload complete ✓              \n');
        sftp.end();
        err2 ? reject(err2) : resolve();
      });
    });
  });
}

async function deploy() {
  const archive = await buildArchive();

  log(`\n🔌 Connecting to ${HOST}...`);
  const conn = new Client();
  await new Promise((resolve, reject) => {
    conn.on('ready', resolve);
    conn.on('error', reject);
    conn.connect({ host: HOST, port: 22, username: USER, password: PASSWORD, readyTimeout: 30000 });
  });
  log('   Connected ✓');

  log('\n🐳 Checking Docker...');
  const dockerVer = await runCmd(conn, 'docker --version 2>/dev/null || echo MISSING');
  if (dockerVer.includes('MISSING')) {
    log('   Installing Docker...');
    await runCmd(conn, 'apt-get update -qq', 120000);
    await runCmd(conn, 'apt-get install -y docker.io curl', 300000);
    await runCmd(conn, 'systemctl enable docker && systemctl start docker');
  } else {
    log(`   ${dockerVer.split('\n')[0]} ✓`);
  }

  log('   Checking docker-compose...');
  const dcVer = await runCmd(conn, 'docker-compose --version 2>/dev/null || docker compose version 2>/dev/null || echo MISSING');
  if (dcVer.includes('MISSING')) {
    log('   Installing docker-compose...');
    await runCmd(conn,
      'curl -sL https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-linux-x86_64 -o /usr/local/bin/docker-compose && chmod +x /usr/local/bin/docker-compose',
      120000
    );
  }

  log('\n📁 Preparing server...');
  await runCmd(conn, `mkdir -p ${REMOTE}`);

  log('\n📤 Uploading...');
  await uploadFile(conn, archive, `${REMOTE}/app.tar.gz`);
  try { fs.unlinkSync(archive); } catch {}

  log('\n📂 Extracting...');
  await runCmd(conn, `cd ${REMOTE} && tar -xzf app.tar.gz && rm -f app.tar.gz`);

  log('\n🛑 Stopping old containers...');
  await runCmd(conn, `cd ${REMOTE} && (docker-compose down 2>/dev/null || docker compose down 2>/dev/null); true`);

  log('\n🔨 Building and starting (3–5 min, please wait)...');
  await runCmd(conn,
    `cd ${REMOTE} && (docker-compose up -d --build 2>&1 || docker compose up -d --build 2>&1)`,
    600000
  );

  log('\n✅ Done!');
  await runCmd(conn, "docker ps --format 'table {{.Names}}\\t{{.Status}}\\t{{.Ports}}'");
  log(`\n🌐 App live at: http://${HOST}`);
  log('   Admin:   admin@wework.com   / adminpass');
  log('   Manager: manager@wework.com / manager123');

  conn.end();
}

deploy().catch(err => { log(`\n❌ Failed: ${err.message}`); process.exit(1); });
