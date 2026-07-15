# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial standalone release extracted from [MoonshotAI/kimi-code](https://github.com/MoonshotAI/kimi-code).
- Published to npm as `minidb-kv` (the unscoped `minidb` name was already taken).
- Pure-Node.js embedded key-value database with WAL + snapshot persistence.
- In-memory (`memory`) and disk-backed (`disk`) value storage modes.
- Secondary indexes (equality, range, unique, sparse), compound indexes, and
  datetime-column indexes.
- Full-text search with Latin + CJK tokenization and TF-IDF ranking.
- RESP TCP server compatible with `redis-cli` and `ioredis`.
- Comprehensive unit and E2E test suites powered by Vitest.
- Cross-platform CI workflow (GitHub Actions).

### Fixed

- Windows `EPERM` during compaction by closing the `ValueReader` before
  renaming WAL/snapshot files.
