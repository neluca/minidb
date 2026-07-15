// Basic CRUD example.
// Run: node --import tsx examples/basic.ts

import { MiniDb } from '../src/index.js';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';

async function main() {
  const dir = path.join(os.tmpdir(), 'minidb-example-basic');
  await fs.rm(dir, { recursive: true, force: true });

  const db = await MiniDb.open({
    dir,
    valueCodec: 'json',
    fsyncPolicy: 'everysec',
  });

  await db.set('user:1', { name: 'Alice', age: 30 });
  await db.set('user:2', { name: 'Bob', age: 25 }, { ttl: 5000 });

  console.log('user:1 =>', db.get('user:1'));
  console.log('user:2 =>', db.get('user:2'));
  console.log('ttl user:2 =>', db.ttl('user:2'), 'ms');

  await db.del('user:1');
  console.log('user:1 exists? =>', db.has('user:1'));

  await db.close();
  await fs.rm(dir, { recursive: true, force: true });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
