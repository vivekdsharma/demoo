const net = require('net');
const { spawn } = require('child_process');

function isPortOpen(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ port, host: '127.0.0.1' }, () => {
      socket.end();
      resolve(true);
    });
    socket.setTimeout(300);
    socket.on('error', () => resolve(false));
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function main() {
  const [redisOpen, pgOpen] = await Promise.all([
    isPortOpen(6379),
    isPortOpen(5433),
  ]);

  if (redisOpen && pgOpen) {
    return;
  }

  // Only auto-start WSL daemon on Windows platform
  if (process.platform === 'win32') {
    console.log('[Services] Redis or PostgreSQL is idle. Waking up background services...');
    try {
      const child = spawn('wsl', ['-d', 'docker-desktop', '-u', 'root', '-e', '/tmp/keepalive-services.sh'], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
      });
      child.unref();

      // Give WSL 3 seconds to spin up Redis and PostgreSQL
      await new Promise((r) => setTimeout(r, 3000));
      console.log('[Services] Services are now online.');
    } catch (err) {
      console.warn('[Services] Could not automatically trigger WSL keepalive:', err.message);
    }
  }
}

main().catch(() => {});
