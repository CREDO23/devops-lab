/**
 * Seam: the migrations, run through run-dbmate.sh as `make db-migrate` does.
 *
 * Needs a real PostgreSQL, found through TEST_DATABASE_URL.
 */
import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { type TestDatabase, createTestDatabase } from './create-test-database.ts';
import { DB_DIRECTORY, runDbmate } from './run-dbmate.ts';

async function tableNames(url: string): Promise<string[]> {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  const { rows } = await client.query<{ tablename: string }>(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`,
  );
  await client.end();
  return rows.map((row) => row.tablename);
}

/** A PATH holding only what the scripts need, so no pg_dump can be found on it. */
function pathWithoutPgDump(directory: string): string {
  for (const tool of ['sed', 'dirname', 'uname', 'grep']) {
    const location = spawnSync('sh', ['-c', `command -v ${tool}`], { encoding: 'utf8' });
    symlinkSync(location.stdout.trim(), join(directory, tool));
  }
  symlinkSync(process.execPath, join(directory, 'node'));
  return directory;
}

describe('the migrations', () => {
  let database: TestDatabase;
  let temporaryFolder: string;

  beforeAll(async () => {
    database = await createTestDatabase();
    temporaryFolder = mkdtempSync(join(tmpdir(), 'kivu-db-'));
  });

  afterAll(async () => {
    await database.drop();
    rmSync(temporaryFolder, { recursive: true });
  });

  /** Every environment starts from nothing at some point; the migrations must build it all. */
  it('builds every core table on an empty database', async () => {
    const { status } = runDbmate(['up'], {
      DATABASE_URL: database.url,
      DBMATE_NO_DUMP_SCHEMA: 'true',
    });

    expect([status, await tableNames(database.url)]).toEqual([
      0,
      ['boats', 'bookings', 'ports', 'routes', 'schema_migrations', 'tickets', 'trips'],
    ]);
  });

  /** A migration that can't be undone is a trap on the day a release has to be rolled back. */
  it('can undo and reapply the newest migration', async () => {
    const env = { DATABASE_URL: database.url, DBMATE_NO_DUMP_SCHEMA: 'true' };

    const rollback = runDbmate(['rollback'], env);
    const up = runDbmate(['up'], env);

    expect([rollback.status, up.status]).toEqual([0, 0]);
  });

  /** Otherwise schema.sql would describe a database that doesn't exist. */
  it('keeps schema.sql in step with the migrations', async (context) => {
    const emptyDatabase = await createTestDatabase();
    const schemaFile = join(temporaryFolder, 'schema.sql');
    try {
      const { status, output } = runDbmate(['up'], {
        DATABASE_URL: emptyDatabase.url,
        DBMATE_SCHEMA_FILE: schemaFile,
      });
      if (output.includes('no pg_dump found')) context.skip('no pg_dump: set PG_DUMP_COMMAND');

      expect([status, readFileSync(schemaFile, 'utf8')]).toEqual([
        0,
        readFileSync(join(DB_DIRECTORY, 'schema.sql'), 'utf8'),
      ]);
    } finally {
      await emptyDatabase.drop();
    }
  });

  /** Having no pg_dump must never block anyone from migrating. */
  it('migrates with a note when no pg_dump is available', async () => {
    const emptyDatabase = await createTestDatabase();
    const folderWithoutEnvFile = mkdtempSync(join(temporaryFolder, 'without-env-file-'));
    try {
      const { status, output } = runDbmate(
        ['up'],
        {
          DATABASE_URL: emptyDatabase.url,
          DBMATE_SCHEMA_FILE: join(folderWithoutEnvFile, 'schema.sql'),
          PG_DUMP_COMMAND: '',
          PATH: pathWithoutPgDump(folderWithoutEnvFile),
        },
        folderWithoutEnvFile,
      );

      expect([status, output]).toEqual([0, expect.stringContaining('schema.sql is not updated')]);
    } finally {
      await emptyDatabase.drop();
    }
  });

  /** Not blocking must not mean silent: schema.sql no longer matches the migrations. */
  it('warns without failing when schema.sql misses a migration', async () => {
    const emptyDatabase = await createTestDatabase();
    const folderWithoutEnvFile = mkdtempSync(join(temporaryFolder, 'without-env-file-'));
    const schemaFile = join(folderWithoutEnvFile, 'schema.sql');
    writeFileSync(schemaFile, 'no migration listed here');
    try {
      const { status, output } = runDbmate(
        ['up'],
        {
          DATABASE_URL: emptyDatabase.url,
          DBMATE_SCHEMA_FILE: schemaFile,
          PG_DUMP_COMMAND: '',
          PATH: pathWithoutPgDump(folderWithoutEnvFile),
        },
        folderWithoutEnvFile,
      );

      expect([status, output]).toEqual([
        0,
        expect.stringMatching(/WARNING: schema\.sql misses these migrations:.*_core_tables\.sql/),
      ]);
    } finally {
      await emptyDatabase.drop();
    }
  });

  /** A warning that fires when nothing is wrong soon gets ignored. */
  it('stays quiet when schema.sql lists every migration', async () => {
    const emptyDatabase = await createTestDatabase();
    const folderWithoutEnvFile = mkdtempSync(join(temporaryFolder, 'without-env-file-'));
    const schemaFile = join(folderWithoutEnvFile, 'schema.sql');
    copyFileSync(join(DB_DIRECTORY, 'schema.sql'), schemaFile);
    try {
      const { status, output } = runDbmate(
        ['up'],
        {
          DATABASE_URL: emptyDatabase.url,
          DBMATE_SCHEMA_FILE: schemaFile,
          PG_DUMP_COMMAND: '',
          PATH: pathWithoutPgDump(folderWithoutEnvFile),
        },
        folderWithoutEnvFile,
      );

      expect([status, output]).toEqual([0, expect.not.stringContaining('WARNING')]);
    } finally {
      await emptyDatabase.drop();
    }
  });

  /** dbmate alone stays silent about this, and the schema file would quietly go stale. */
  it('reports a pg_dump that fails, with the cause', async () => {
    const emptyDatabase = await createTestDatabase();
    const failingPgDump = join(temporaryFolder, 'failing-pg-dump');
    writeFileSync(failingPgDump, '#!/bin/sh\necho "server version mismatch" >&2\nexit 1\n', {
      mode: 0o755,
    });
    try {
      const { status, output } = runDbmate(['up'], {
        DATABASE_URL: emptyDatabase.url,
        DBMATE_SCHEMA_FILE: join(temporaryFolder, 'unused.sql'),
        PG_DUMP_COMMAND: failingPgDump,
      });

      expect([status, output]).toEqual([
        1,
        expect.stringMatching(/schema\.sql was not updated.*server version mismatch/),
      ]);
    } finally {
      await emptyDatabase.drop();
    }
  });
});
