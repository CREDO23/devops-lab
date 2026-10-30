/**
 * Seam: the type generation command, run as `make db-generate-types` does.
 *
 * Needs a real PostgreSQL, found through TEST_DATABASE_URL, and the API and worker installed.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { type TestDatabase, createTestDatabase } from './create-test-database.ts';
import { DB_DIRECTORY } from './run-dbmate.ts';

const COMMITTED_API_TYPES = join(DB_DIRECTORY, '../api/src/database/generated-types.ts');
const COMMITTED_WORKER_MODELS = join(
  DB_DIRECTORY,
  '../worker/src/kivu_ferry_worker/database/generated_models.py',
);

describe('the generated types', { timeout: 60_000 }, () => {
  let database: TestDatabase;
  let temporaryFolder: string;

  function generateTypes(prefix: string): { api: string; worker: string } {
    const apiTypesFile = join(temporaryFolder, `${prefix}-types.ts`);
    const workerModelsFile = join(temporaryFolder, `${prefix}-models.py`);
    const { status, stdout, stderr } = spawnSync(`${DB_DIRECTORY}scripts/generate-types.sh`, {
      cwd: DB_DIRECTORY,
      env: {
        ...process.env,
        DATABASE_URL: database.url,
        DBMATE_NO_DUMP_SCHEMA: 'true',
        API_TYPES_FILE: apiTypesFile,
        WORKER_MODELS_FILE: workerModelsFile,
      },
      encoding: 'utf8',
    });
    if (status !== 0) throw new Error(`generate-types.sh failed:\n${stdout}${stderr}`);
    return {
      api: readFileSync(apiTypesFile, 'utf8'),
      worker: readFileSync(workerModelsFile, 'utf8'),
    };
  }

  beforeAll(async () => {
    database = await createTestDatabase();
    temporaryFolder = mkdtempSync(join(tmpdir(), 'kivu-types-'));
  });

  afterAll(async () => {
    await database.drop();
    rmSync(temporaryFolder, { recursive: true });
  });

  /** A schema change must show up as a type error in both services, not as a failure in production. */
  it('keeps both services in step with the migrations', () => {
    const { api, worker } = generateTypes('first');

    expect([api, worker]).toEqual([
      readFileSync(COMMITTED_API_TYPES, 'utf8'),
      readFileSync(COMMITTED_WORKER_MODELS, 'utf8'),
    ]);
  });

  /** Otherwise every run would leave a diff that means nothing. */
  it('running it twice changes nothing', () => {
    const first = generateTypes('once');
    const second = generateTypes('twice');

    expect(second).toEqual(first);
  });
});
