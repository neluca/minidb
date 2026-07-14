import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'minidb-e2e',
    include: ['test/e2e/**/*.test.ts'],
  },
});
