/** Features are used only through their public API: their index.ts. */
module.exports = {
  forbidden: [
    {
      name: 'feature-internals-from-another-feature',
      severity: 'error',
      from: { path: '^src/([^/]+)/' },
      to: { path: '^src/[^/]+/', pathNot: ['^src/$1/', '^src/[^/]+/index\\.tsx?$'] },
    },
    {
      name: 'feature-internals-from-the-app',
      severity: 'error',
      from: { path: '^src/[^/]+\\.tsx?$' },
      to: { path: '^src/[^/]+/', pathNot: '^src/[^/]+/index\\.tsx?$' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsConfig: { fileName: 'tsconfig.json' },
    tsPreCompilationDeps: true,
  },
};
