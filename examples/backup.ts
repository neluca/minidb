// Online backup and restore example.
// Run: node --import tsx examples/backup.ts

import { MiniDb } from '../src/index.js';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';

async function main() {
  const dataDir = path.join(os.tmpdir(), 'minidb-example-backup-data');
  const backupDir = path.join(os.tmpdir(), 'minidb-example-backup-copy');
  const restoreDir = path.join(os.tmpdir(), 'minidb-example-backup-restored');

  for (const d of [dataDir, backupDir, restoreDir]) {
    await fs.rm(d, { recursive: true, force: true });
  }

  const db = await MiniDb.open({
    dir: dataDir,
    valueCodec: 'json',
    fsyncPolicy: 'no',
  });

  await db.set('k1', { v: 1 });
  await db.set('k2', { v: 2 });

  await db.backup(backupDir, { compact: true });
  console.log('Backup written to', backupDir);

  await db.close();

  const restored = await MiniDb.restore(backupDir, restoreDir, { valueCodec: 'json' });
  console.log('Restored k1 =>', restored.get('k1'));
  console.log('Restored k2 =>', restored.get('k2'));

  await restored.close();

  for (const d of [dataDir, backupDir, restoreDir]) {
    await fs.rm(d, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
