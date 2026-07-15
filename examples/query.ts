// Unified query example.
// Run: node --import tsx examples/query.ts

import { MiniDb } from '../src/index.js';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';

interface Post {
  title: string;
  author: string;
  tags: string[];
  views: number;
}

async function main() {
  const dir = path.join(os.tmpdir(), 'minidb-example-query');
  await fs.rm(dir, { recursive: true, force: true });

  const db = await MiniDb.open<Post>({
    dir,
    valueCodec: 'json',
    fsyncPolicy: 'no',
  });

  await db.set('post:1', {
    title: 'Hello Beijing',
    author: 'alice',
    tags: ['travel', 'china'],
    views: 120,
  });
  await db.set('post:2', {
    title: 'Node.js Tips',
    author: 'bob',
    tags: ['tech', 'nodejs'],
    views: 85,
  });
  await db.set('post:3', {
    title: 'Beijing Food Guide',
    author: 'alice',
    tags: ['food', 'china'],
    views: 200,
  });

  await db.createTextIndex('byTitle', { fields: ['title'] });
  await db.createIndex('byViews', { field: 'views', type: 'range' });

  const results = db.query({
    key: { prefix: 'post:' },
    text: { index: 'byTitle', q: 'Beijing', op: 'AND' },
    filter: { views: { $gte: 100 } },
    sort: { views: -1 },
    project: ['title', 'author', 'views'],
    limit: 10,
  });

  console.log('Query results:', results);

  await db.close();
  await fs.rm(dir, { recursive: true, force: true });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
