# minidb

[English](./README.md) | 中文

[![CI](https://github.com/neluca/minidb/actions/workflows/ci.yml/badge.svg)](https://github.com/neluca/minidb/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

一个**纯 Node.js**（零原生扩展）嵌入式键值数据库，融合了 **Redis**（内存 KV 速度、数据结构、AOF 式重写）与 **SQLite**（持久化单文件、WAL、索引查询）的设计思想。使用 **TypeScript** 编写，类型严格，运行时零依赖。

> 通过研究 Redis、SQLite、NeDB、Bitcask 以及一个迷你 SQLite 克隆的真实源码构建而成 —— 各数据库给我们的启示请见 [`DESIGN_NOTES.md`](./DESIGN_NOTES.md)。

## 特性

- **O(1) GET/SET**：基于内存索引（`Map`），值以字节形式存储。
- **可选的超内存值**：`valueMode: 'disk'` 只在内存中保留值指针，通过同步定位读取从快照/WAL 中读取值内容。
- **持久化**：只追加 **WAL（预写日志）**，支持组提交与三种 fsync 策略（`always` / `everysec` / `no`），与 Redis AOF 一致。
- **崩溃安全恢复**：CRC 帧记录；崩溃导致的尾部撕裂会被自动检测并截断。
- **快照 + 压缩合并**（WAL 重写）：控制磁盘增长并加快重启。
- **TTL**：惰性 + 主动过期（Redis 风格，基于堆实现）。
- **二级索引**：JSON 文档上的等值与**范围**索引，底层采用 Redis 风格的**跳表**，支持 O(log N) 排名/范围查询；支持唯一索引与稀疏索引；数组字段按元素索引。
- **RESP 服务器**（可选）：可用 `redis-cli` / `ioredis` 直接连接。
- **值编解码器**：`buffer`、`string` 或 `json`。
- **零依赖**，仅使用 `node:*` 内置模块。

## 安装与目录结构

```bash
npm install minidb
```

或克隆本仓库并安装开发依赖：

```bash
git clone https://github.com/neluca/minidb.git
cd minidb
npm install
```

使用 **TypeScript** 编写，运行时零依赖。源码位于 `src/`，构建输出到 `dist/`（通过 `npm run build` 生成）。

```
src/
  index.ts          公共 API（MiniDb）与类型
  codec.ts          二进制帧编码/解码 + CRC 解析 + 重新同步
  crc32.ts          基于查表的 CRC-32
  wal.ts            缓冲追加 + 组提交 + fsync 策略
  store.ts          内存索引 + TTL（惰性 + 主动）+ 值引用
  value-reader.ts   磁盘值的同步定位读取
  snapshot.ts       分块快照写入器
  recovery.ts       加载快照 + 回放 WAL + 重新同步/截断
  compaction.ts     WAL 重写 / 轮转
  skiplist.ts       比较器驱动的跳表（带 span）
  index-manager.ts  二级索引（等值 + 范围）
  dt-index.ts       日期时间列索引
  query.ts          类 jq 的值查询引擎
  text-index.ts     全文索引（内存词典 + 磁盘倒排）
  text-postings.ts  全文索引的磁盘倒排文件
  lockfile.ts       独占文件锁 + 只读
  server.ts         可选 RESP TCP 服务器
```

```bash
npm run build      # 编译 src/ -> dist/（JS + .d.ts）
npm run typecheck  # tsc --noEmit（严格模式）
```

## 示例

查看 [`examples/`](./examples/) 目录获取可运行的 TypeScript 示例：

- [`basic.ts`](./examples/basic.ts) — CRUD、TTL
- [`indexes.ts`](./examples/indexes.ts) — 二级索引
- [`query.ts`](./examples/query.ts) — 带全文搜索的统一查询
- [`backup.ts`](./examples/backup.ts) — 在线备份与恢复
- [`server.ts`](./examples/server.ts) — RESP 服务器

运行示例：

```bash
node --import tsx examples/basic.ts
```

## 快速开始（嵌入式）

```ts
import { MiniDb } from 'minidb';

const db = await MiniDb.open({
  dir: './data',
  valueCodec: 'string',     // 'buffer' | 'string' | 'json'
  fsyncPolicy: 'everysec',  // 'always' | 'everysec' | 'no'
});

await db.set('hello', 'world');
db.get('hello');            // 'world'

await db.set('temp', 'x', { ttl: 5000 }); // 5 秒后过期
db.ttl('temp');             // 剩余毫秒数（-1 表示无过期，-2 表示不存在）

await db.del('hello');
await db.close();           // 刷新 + fsync + 关闭
```

> 在本仓库中开发时，从 `./src/index.ts` 导入（使用 `tsx` 运行）。作为已安装的包使用时，从 `'minidb'` 导入（使用构建后的 `dist/` 输出）。

重新打开同一个 `dir`，数据会从快照 + WAL 中恢复。

### 带类型的使用

`MiniDb` 对值类型是泛型的：

```ts
interface User { name: string; age: number; city: string }
const db = await MiniDb.open<User>({ dir: './data', valueCodec: 'json' });
await db.set('u1', { name: 'Ann', age: 30, city: 'Paris' });
const u = db.get('u1'); // User | undefined
```

### JSON + 二级索引

```js
const db = await MiniDb.open({ dir: './data', valueCodec: 'json' });

await db.createIndex('byCity', { field: 'city' });                 // 等值索引
await db.createIndex('byAge',  { field: 'age',  type: 'range' });  // 范围索引（跳表）
await db.createIndex('byMail', { field: 'email', unique: true });  // 唯一索引

await db.set('u1', { name: 'Ann', city: 'Paris', age: 30, email: 'a@x.com' });
await db.set('u2', { name: 'Bob', city: 'Paris', age: 41, email: 'b@x.com' });

db.findEq('byCity', 'Paris');          // [{ key:'u1', value:{...} }, { key:'u2', ... }]
db.findRange('byAge', { min: 30, max: 40, count: 10 });
```

索引定义会被持久化，并在启动时从存储中重建。

## 文档模型与查询（类 MongoDB 子集）

一条记录的结构如下：

```js
{ key: 'user:1234', value: { ...任意 JSON... }, dt1..dtN: <日期时间列> }
```

- **key** — 长度 ≤ 128 字符的字符串，唯一，**有序**（支持范围 / 前缀 / 有序扫描）。
- **value** — 任意 JSON 对象（支持类 jq 过滤、投影、全文搜索）。
- **dt1..dtN** — 任意数量的顶层**日期时间列**，每个列都会被索引以支持 O(log N) 范围查询。通过 `{ dt: { created: Date.now() } }` 传入（支持 ISO 字符串或 epoch 毫秒）。

### Key 扫描（有序）

```js
db.scan({ gte: 'user:1', lte: 'user:9', limit: 100 }); // key 顺序范围扫描
db.prefix('user:');                                    // 前缀扫描
```

### 日期时间列查询

```js
await db.set('a', { n: 1 }, { dt: { created: '2024-01-01' } });
db.dtColumns();                              // ['created']
db.dtRange('created', { gte: t0, lte: t1 }); // O(log N)，返回 [{ key, value, dt, dtValue }]
```

### 统一查询

`db.query(q)` 组合 key 范围、dt 范围、全文搜索与值过滤：

```js
db.query({
  key:    { prefix: 'post:' },
  dt:     { created: { gte: t0, lte: t1 } },
  text:   { index: 'body', q: '北京', op: 'AND' },
  filter: { age: { $gte: 18 }, $or: [{ city: 'Paris' }, { city: 'London' }] },
  sort:   { age: -1 },
  project: ['name', 'age'],
  skip: 0, limit: 20,
});
```

过滤操作符：`$eq $ne $gt $gte $lt $lte $in $nin $regex $exists $contains $type`，以及逻辑组合 `$and $or $nor $not`。路径支持点号/括号写法（`"address.city"`、`"tags[0]"`）。

> 已索引的维度（key / dt / text / `createIndex` 字段）查询很快；`db.query()` 会自动为简单顶层谓词（包括 `$and`）使用匹配的等值/范围值索引，而没有任何匹配索引的值 `filter` 会回退到全集合扫描，就像 MongoDB 没有索引时一样。

### 全文搜索

```js
await db.createTextIndex('body', { fields: ['bio'] }); // fields 可选，默认索引所有字符串
db.search('body', 'hello 世界', { op: 'AND' });         // [{ key, value, score }]
```

支持拉丁词 + CJK 单字/双字分词（无需词典，零依赖），并按 TF-IDF 排序。

## API

| 方法 | 说明 |
|---|---|
| `MiniDb.open({ dir, valueCodec?, valueMode?, fsyncPolicy?, compactThresholdBytes?, autoCompact?, activeExpireIntervalMs?, recovery?, readOnly?, onLockFail?, maxMemoryBytes?, maxMemoryPolicy? })` | 打开 / 创建数据库 |
| `MiniDb.restore(srcDir, destDir, opts?)` | 恢复 `db.backup()` 目录并打开 |
| `MiniDb.openOrRebuild(opts, { onRebuild? })` | 打开；若损坏则丢弃并重新打开为空（适用于缓存）。不会删除仍被活动进程锁定（live-locked）的数据库 |
| `get(key)` | 返回解码后的值或 `undefined` |
| `set(key, value, { ttl? })` | 写入；`ttl` 单位为毫秒。按 fsync 策略 resolve |
| `del(key)` | 删除；若 key 存在返回 `true` |
| `has(key)`、`size` | 成员判断 / 存活 key 数量 |
| `mget([keys])`、`mset([[k,v],...])` | 批量读 / 写 |
| `batch([{op:'set'\|'del', key, value?, ttl?, dt?}])` | 原子提交多个操作（要么全部成功，要么全部失败） |
| `expire(key, ttlMs)`、`ttl(key)` | 设置 / 读取 TTL |
| `createIndex(name, { field, type?, unique?, sparse? })` | 创建二级索引（json 编解码器） |
| `dropIndex(name)`、`listIndexes()` | 管理索引 |
| `findEq(name, value)`、`findRange(name, opts)` | 查询值索引 |
| `createCompoundIndex(name, { groupBy, orderBy, orderType? })` | 创建复合索引（分组 + 排序，例如 workspace + updatedAt） |
| `compoundRange(name, groupValue, opts)` | 在分组内有序范围查询，O(log N + limit)，无需全排序 |
| `dropCompoundIndex(name)`、`listCompoundIndexes()` | 管理复合索引 |
| `scan({ gte, gt, lte, lt, limit, reverse })` | 有序 key 范围扫描 |
| `prefix(p, limit?)` | key 前缀扫描 |
| `dtColumns()`、`dtRange(col, opts)` | 日期时间列范围查询 |
| `query({ key, dt, text, filter, project, sort, skip, limit })` | 统一类 Mongo 查询 |
| `createTextIndex(name, { fields? })`、`dropTextIndex(name)` | 全文索引 |
| `search(name, q, { op?, limit? })` | 全文搜索 |
| `compact()` | 立即强制执行快照 + WAL 重写 |
| `backup(destDir, { compact? })` | 写入一致的在线备份目录 |
| `close()` | 刷新、fsync、关闭 |

### 持久化策略（`fsyncPolicy`）

| 策略 | 保证 | 相对速度 |
|---|---|---|
| `always` | 每次刷新后 fsync | 最慢（最安全） |
| `everysec` | 每秒 fsync 一次（默认） | 快，≤1 秒丢失窗口 |
| `no` | 由操作系统决定何时刷盘 | 最快，断电可能丢失数秒数据 |

### 值存储模式（`valueMode`）

`valueMode` 控制值主体存储在哪里：

```js
const db = await MiniDb.open({
  dir: './data',
  valueCodec: 'json',
  valueMode: 'memory', // 'memory' | 'disk' | 'auto'
});
```

- `memory`（默认）：值保留在内存中，Redis 风格。读取受内存限制。
- `disk`：值保留在持久化快照/WAL 中，内存只保留 key、元数据、索引以及小的 `{ file, off, len }` 值指针。读取使用同步定位读取，因此公共 API 仍保持同步。这允许值容量超过内存，代价是冷 `get()` 路径触发磁盘读取。
- `auto`：启动时比较当前 `db.snapshot` + `db.wal` 大小与 `maxMemoryBytes`。若持久化文件超过预算则以 `disk` 打开，否则以 `memory` 打开。若未设置 `maxMemoryBytes`，`auto` 回退到 `memory`。

### 内存限制

使用 `valueMode: 'memory'` 时，预算同时限制 key 与 value。使用 `valueMode: 'disk'` 时，预算只限制内存中的 key/元数据/索引占用，不包含值主体。可通过近似内存预算限制写入：

```js
const db = await MiniDb.open({
  dir: './data',
  valueCodec: 'json',
  maxMemoryBytes: 512 * 1024 * 1024,
  maxMemoryPolicy: 'reject', // 或 'evict-lru'
});
```

`reject` 在写入会超出预算时抛出错误；`evict-lru` 会先持久化删除最近最少使用的 key。在 `valueMode: 'disk'` 下，`evict-lru` 只裁剪 key 以限制元数据/索引占用，不会删除磁盘上的值字节，因为值已经不在内存中。`db.stats.evictions` 与 `db.stats.maxMemoryRejections` 会记录相应行为。

### 在线备份 / 恢复

```js
await db.backup('./backup');
const restored = await MiniDb.restore('./backup', './restored', { valueCodec: 'json' });
```

`backup()` 会刷新 WAL、可选地压缩合并，并复制快照、WAL、索引定义和文本倒排，期间写入者会被短暂暂停，生成一个 `restore()` 可重新打开的一致性目录。

### 写入吞吐与 SSD 寿命

MiniDb 的写入路径是只追加且顺序的，本身对 SSD 友好。以下几个选择会显著影响写入放大与闪存磨损：

- **使用批量写入。** `set()` 在每次刷新后 resolve，因此 `for (const x of xs) await db.set(...)` 每个 key 都会触发一次刷新（在 `fsyncPolicy: 'always'` 下还会触发一次 fsync）。使用 `db.batch([...])` / `db.mset([[k, v], ...])`（单条原子 WAL 帧）或 `await Promise.all(xs.map(x => db.set(x)))`（组提交把同一 tick 合并为一次 `writev` + 一次 fsync）来合并写入。
- **保持默认 `fsyncPolicy: 'everysec'`。** 它把 fsync 限制在约 1 次/秒。`always` 最持久但对闪存最狠（每次刷新一次 fsync）；只在必须 survive 任何崩溃的数据上使用它。
- **为大数据集调整 `compactThresholdBytes`。** 压缩会重写所有存活数据，因此稳态写入放大大约为 `1 + liveDataBytes / compactThresholdBytes`。提高阈值（例如 256 MiB–1 GiB）以更大的 WAL / 更长的恢复时间为代价，减少重写。
- **通过 `db.stats` 观察。** `walBytesWritten`、`walFsyncs`、`snapshotBytesWritten`、`compactions`、`evictions`、`maxMemoryRejections`、`queryIndexHits` 可用于测量实际写入量、fsync 频率、内存压力和索引使用情况。

## RESP 服务器（兼容 redis-cli）

```bash
npm run server -- --dir ./data --port 6379
# 或：node --import tsx src/server.ts --dir ./data --port 6379
```

然后在另一个 shell：

```bash
redis-cli -p 6379 SET foo bar
redis-cli -p 6379 GET foo
```

支持的命令：`PING ECHO GET SET DEL EXISTS MGET MSET TTL DBSIZE COMPACT INFO QUIT`。

## 基准测试

在 Node v24、100 字节值（`npm run bench`，`N=100000`）下测得：

| 操作 | 吞吐量 |
|---|---|
| 原始 `Map` set（基线） | ~8.6 M ops/s |
| 原始 `Map` get（基线） | ~20 M ops/s |
| **DB get**（内存模式） | **~8.0 M ops/s** |
| **DB set, fsync=everysec**（并发，组提交） | **~725 k ops/s** |
| **DB set, fsync=no**（并发，组提交） | **~396 k ops/s** |
| DB set, fsync=always（顺序，1 fsync/op） | ~328 ops/s |
| 10 万 key 快照压缩 | ~69 ms（12 MiB） |

读取受内存限制，与原始 `Map` 接近。写入受磁盘限制；**组提交**让并发写入非常快，而同步写入（`always`）则承受任何数据库都不可避免的 fsync 成本。具体数字因机器/磁盘而异。

查询基准测试（N=50k 文档，各 200 次迭代，`node bench/query.ts`）：

| 查询 | 吞吐量 |
|---|---|
| dt 范围（小结果集） | ~183 k ops/s |
| key 前缀扫描（约 100 行） | ~23 k ops/s |
| 全文搜索（拉丁/CJK） | ~350–490 ops/s |
| 值过滤，**无索引**（50k 全表扫描） | ~23 ops/s |

已索引维度（key / dt / text）查询很快；未索引的值过滤会扫描整个集合 —— 对热点值谓词创建二级索引（`createIndex`）。

对于**分组内有序分页**（例如 "workspace 中按 updatedAt 排序的 sessions"），使用**复合索引**而不是拉取整个分组再内存排序。在 1 万 sessions 的单个 workspace 中，使用 `compoundRange` 分页比 "fetch-all + sort" 快约 20–40 倍，且任意偏移都保持在亚毫秒级。

## 测试

两套测试套件，使用 [Vitest](https://vitest.dev) 运行：

```bash
npm test            # 单元测试（快）
npm run test:e2e    # 端到端稳定性套件
npm run test:all    # 全部
```

**单元测试**（`test/*.test.ts`）覆盖每个模块：帧编解码/CRC、WAL 组提交、store TTL、快照/压缩合并、恢复截断、跳表、二级/全文索引以及 RESP 服务器。

**E2E 稳定性套件**（`test/e2e/*.test.ts`）覆盖崩溃安全与长期运行行为：

| 文件 | 验证内容 |
|---|---|
| `fuzz-model.test.ts` | 成千上万随机操作与参考模型一致（可复现种子） |
| `crash-recovery.test.ts` | `kill -9` 发生在写入或压缩合并中途 → 恢复始终一致 |
| `index-consistency.test.ts` | key/dt/二级/全文索引与 store 永不偏离 |
| `compaction-race.test.ts` | 压缩合并期间大量并发写入不丢数据 |
| `recovery-matrix.test.ts` | 在 `resync` 与 `strict` 模式下，WAL 头/中/尾部损坏的恢复表现 |
| `durability.test.ts` | `always`/`everysec`/`no` 的 close 持久化 + 多次开闭循环 |
| `boundary.test.ts` | key 长度限制、大值、大量 key、空数据库 |
| `soak.test.ts` | 持续操作 + 堆稳定性（可选：`SOAK=30 npm run test:e2e`） |

## 一句话设计

日志结构引擎：所有写入追加到 CRC 帧 **WAL**（组提交、可配置 fsync）；所有读取命中内存 `Map`。当 WAL 超过阈值时，会写入存活 key 的 **快照** 并轮转 WAL —— **非阻塞**：快照写入期间写入者继续追加到 WAL（WAL 同时充当 Redis 风格的重写缓冲区），只在最后的短暂轮转阶段暂停。恢复时加载最新快照并重放 WAL，截断撕裂的尾部。二级索引使用 Redis 风格的跳表支持范围查询。完整设计 rationale 与源码研究请见 [`DESIGN_NOTES.md`](./DESIGN_NOTES.md)。

## 并发与多进程

minidb 是**单写者**。以写入模式打开目录会获取独占锁文件（`db.lock`）；第二个写入者会被 `LockError` 拒绝。只有在锁持有者 PID 已死时才会接管锁（陈旧锁恢复），不会因为锁旧就接管。

```js
// 第二个进程：抛出 LockError
await MiniDb.open({ dir: './data' });

// 降级为只读而不是抛错
const ro = await MiniDb.open({ dir: './data', onLockFail: 'readonly' });
ro.get('k');        // 可以
await ro.set('k');  // 抛出 "read-only mode"

// 与写入者同时以只读打开
const r = await MiniDb.open({ dir: './data', readOnly: true });
```

多客户端场景请运行 **RESP 服务器**（单个 minidb 进程，多个 TCP 客户端）—— 这是与 Redis 类似的预期并发访问模型。

对于**可重建缓存**，使用 `openOrRebuild`：损坏的缓存会被丢弃并重新打开为空，而仍被活动进程锁定（live-locked）的数据库不会被销毁：

```js
const db = await MiniDb.openOrRebuild(
  { dir: cacheDir, valueCodec: 'json' },
  { onRebuild: (err) => log.warn('cache rebuilt:', err.message) },
);
```

## 注意事项 / 路线图

- 默认 `valueMode: 'memory'` 下，数据集必须像 Redis 一样能放入内存。若值容量需要超过内存，请使用 `valueMode: 'disk'`；冷读取会对快照/WAL 执行同步定位读取。
- 全文索引倒排存储在磁盘上（可超内存）；只有词项词典与每文档元数据保留在内存中。倒排会在打开与压缩合并时从 store 重建。搜索以同步方式读取倒排，因此一个非常大且冷的倒排列表可能会短暂阻塞事件循环。
- 压缩合并对写入**非阻塞**：WAL 本身充当 `BGREWRITEAOF` 风格的重写缓冲区，快照写入期间写入者继续追加，只在最后短暂轮转（一次刷新、少量尾部拷贝、两次原子重命名）时暂停。
- 快照编码在主线程运行（分块 + 让出）；后续计划优化为 offload 到 `worker_thread`。
- 单进程 / 单写者。

## 致谢

设计提炼自阅读：Redis（`references/redis`）、SQLite WAL 论文、NeDB（`references/nedb`）、Bitcask（`references/bitcask`）以及 cstack SQLite 教程（`references/db_tutorial`）。

## 来源

`minidb` 最初由 Moonshot AI 在 [kimi-code](https://github.com/MoonshotAI/kimi-code) 项目中开发，并以 MIT 协议发布。本仓库将其提取为一个独立的、持续维护的开源包。
