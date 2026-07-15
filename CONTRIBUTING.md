# Contributing to minidb

Thank you for your interest in contributing to minidb! This document provides
 guidelines for participating in the project.

## Getting started

1. Fork the repository on GitHub.
2. Clone your fork locally:
   ```bash
   git clone https://github.com/<your-username>/minidb.git
   cd minidb
   ```
3. Install dependencies:
   ```bash
   npm install
   ```

## Development workflow

- Source code lives in `src/`.
- Tests live in `test/` (unit) and `test/e2e/` (end-to-end stability).
- Benchmarks live in `bench/`.

Run the full validation suite before committing:

```bash
npm run typecheck
npm test
npm run test:e2e
npm run build
```

Or simply:

```bash
npm run test:all
npm run build
```

## Making changes

1. Create a new branch for your work:
   ```bash
   git checkout -b my-feature
   ```
2. Make focused, minimal changes. Each commit should represent a single logical
   step.
3. Add or update tests to cover your changes.
4. Update relevant documentation (`README.md`, `README.zh-CN.md`,
   `DESIGN_NOTES.md`) if the public API or behavior changes.
5. Ensure the full test suite passes on your local machine.

## Code style

- TypeScript strict mode is enabled. Avoid `any` in new code.
- Prefer explicit types for public APIs.
- Keep runtime dependencies at zero; only `node:*` built-ins are allowed in
  library code.
- Match the existing formatting and naming conventions in the files you edit.

## Reporting bugs

When reporting a bug, please include:

- A clear description of the issue.
- Steps to reproduce (ideally a minimal code snippet).
- Your environment: OS, Node.js version, and minidb version.
- Any relevant error messages or stack traces.

Use the [bug report template](https://github.com/neluca/minidb/issues/new?template=bug_report.md).

## Requesting features

Feature requests are welcome. Please describe the use case, proposed API, and
any alternatives you have considered.

Use the [feature request template](https://github.com/neluca/minidb/issues/new?template=feature_request.md).

## Pull request process

1. Ensure your branch is up to date with `main`.
2. Open a pull request with a clear title and description.
3. Link any related issues.
4. Wait for CI to pass and for a maintainer to review.

## License

By contributing to minidb, you agree that your contributions will be licensed
under the [MIT License](./LICENSE).
