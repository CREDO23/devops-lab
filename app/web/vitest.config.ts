import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    include: ['test/**/*.test.ts'],
    // The HTTP and process tests run the built web app, the same build that ships.
    globalSetup: ['test/build-once.ts'],
  },
});
