// Secondary index example.
// Run: node --import tsx examples/indexes.ts

import { MiniDb } from '../src/index.js';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';

interface User {
  name: string;
  age: number;
  city: string;
  email: string;
}

async function main() {
  const dir = path.join(os.tmpdir(), 'minidb-example-indexes');
  await fs.rm(dir, { recursive: true, force: true });

  const db = await MiniDb.open<User>({
    dir,
    valueCodec: 'json',
    fsyncPolicy: 'no',
  });

  await db.createIndex('byCity', { field: 'city' });
  await db.createIndex('byAge', { field: 'age', type: 'range' });
  await db.createIndex('byEmail', { field: 'email', unique: true });

  await db.set('u1', { name: 'Ann', age: 30, city: 'Paris', email: 'ann@example.com' });
  await db.set('u2', { name: 'Bob', age: 41, city: 'Paris', email: 'bob@example.com' });
  await db.set('u3', { name: 'Cara', age: 35, city: 'London', email: 'cara@example.com' });

  console.log('In Paris:', db.findEq('byCity', 'Paris'));
  console.log('Ages 30-40:', db.findRange('byAge', { min: 30, max: 40, count: 10 }));

  await db.close();
  await fs.rm(dir, { recursive: true, force: true });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
