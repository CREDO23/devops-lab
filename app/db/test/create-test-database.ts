/** A throwaway database per test file: tests never touch real data or each other. */
import { randomUUID } from 'node:crypto';

import pg from 'pg';

import { runDbmate } from './run-dbmate.ts';

function testDatabaseUrl(): string {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error('Start PostgreSQL, then set TEST_DATABASE_URL');
  return url;
}

export interface TestDatabase {
  url: string;
  drop: () => Promise<void>;
}

export async function createTestDatabase(): Promise<TestDatabase> {
  const name = `kivu_test_${randomUUID().replaceAll('-', '')}`;
  const url = new URL(testDatabaseUrl());
  const client = new pg.Client({ connectionString: testDatabaseUrl() });
  await client.connect();
  await client.query(`CREATE DATABASE ${name}`);
  await client.end();

  url.pathname = `/${name}`;
  return {
    url: url.toString(),
    drop: async () => {
      const dropClient = new pg.Client({ connectionString: testDatabaseUrl() });
      await dropClient.connect();
      await dropClient.query(`DROP DATABASE ${name} WITH (FORCE)`);
      await dropClient.end();
    },
  };
}

/** Migrated, without touching the committed schema.sql. */
export async function createMigratedTestDatabase(): Promise<TestDatabase> {
  const database = await createTestDatabase();
  const { status, output } = runDbmate(['up'], {
    DATABASE_URL: database.url,
    DBMATE_NO_DUMP_SCHEMA: 'true',
  });
  if (status !== 0) {
    await database.drop();
    throw new Error(`migrations failed:\n${output}`);
  }
  return database;
}
