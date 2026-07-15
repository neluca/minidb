import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'minidb-e2e',
    include: ['test/e2e/**/*.test.ts'],
    // E2E tests exercise crash recovery, durability, and heavy concurrent
    // workloads. Windows CI runners are slower and need more time per test.
    testTimeout: 60000,
  },
});
