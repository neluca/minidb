// RESP server example.
// Run: node --import tsx examples/server.ts
// Then in another shell: redis-cli -p 6379 SET hello world

import { startServer } from '../src/server.js';

const { host, port, close } = await startServer({
  dir: './data',
  port: 6379,
  fsyncPolicy: 'everysec',
});

console.log(`minidb RESP server listening on ${host}:${port}`);
console.log('Press Ctrl+C to stop.');

process.on('SIGINT', async () => {
  await close();
  process.exit(0);
});
