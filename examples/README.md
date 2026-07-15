# minidb Examples

These examples demonstrate common use cases for minidb. They are written in
TypeScript and run directly with `tsx`.

## Prerequisites

```bash
npm install
```

## Running examples

```bash
# Basic CRUD
node --import tsx examples/basic.ts

# Secondary indexes
node --import tsx examples/indexes.ts

# Unified query with full-text and filters
node --import tsx examples/query.ts

# Online backup and restore
node --import tsx examples/backup.ts

# RESP server (redis-cli compatible)
node --import tsx examples/server.ts
```

Each example creates a temporary database directory under `os.tmpdir()` and
cleans it up on exit.
