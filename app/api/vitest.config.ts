import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    // The API's own logs only show up for a failing test.
    silent: 'passed-only',
    // The process tests run the compiled API, the same build that ships.
    globalSetup: ['test/build-once.ts'],
  },
});
