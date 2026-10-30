/**
 * Seam: the fake data command, run as `make db-seed` does.
 *
 * Needs a real PostgreSQL, found through TEST_DATABASE_URL.
 */
import { spawnSync } from 'node:child_process';

import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { type TestDatabase, createMigratedTestDatabase } from './create-test-database.ts';
import { DB_DIRECTORY } from './run-dbmate.ts';

const TRIPS_A_DAY = 24;
const DAYS_AHEAD = 14;

function loadFakeData(
  url: string,
  allowFakeData = 'true',
): { status: number | null; output: string } {
  const result = spawnSync(process.execPath, ['seed/load-fake-data.ts'], {
    cwd: DB_DIRECTORY,
    env: { ...process.env, DATABASE_URL: url, ALLOW_FAKE_DATA: allowFakeData },
    encoding: 'utf8',
  });
  return { status: result.status, output: `${result.stdout}${result.stderr}` };
}

async function query<Row extends pg.QueryResultRow>(url: string, sql: string): Promise<Row[]> {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  const { rows } = await client.query<Row>(sql);
  await client.end();
  return rows;
}

describe('the fake data', () => {
  let database: TestDatabase;

  beforeAll(async () => {
    database = await createMigratedTestDatabase();
    loadFakeData(database.url);
  });

  afterAll(async () => {
    await database.drop();
  });

  /** A traveller can search any pair of ports, so every direction needs a fare and a boat. */
  it('creates a route, with trips, for every direction between the ports', async () => {
    const [counts] = await query<{ routes: number; routes_without_trips: number }>(
      database.url,
      `SELECT count(*)::int AS routes,
              count(*) FILTER (WHERE NOT EXISTS (
                SELECT FROM trips WHERE trips.route_id = routes.id
              ))::int AS routes_without_trips
       FROM routes`,
    );

    expect(counts).toEqual({ routes: 20, routes_without_trips: 0 });
  });

  /** It runs again to add the coming days, and must not disturb what's already there. */
  it('running it twice changes nothing', async () => {
    const snapshot = `SELECT (SELECT json_agg(row ORDER BY id) FROM ports row) AS ports,
                             (SELECT json_agg(row ORDER BY id) FROM routes row) AS routes,
                             (SELECT json_agg(row ORDER BY id) FROM boats row) AS boats,
                             (SELECT json_agg(row ORDER BY id) FROM trips row) AS trips`;
    const before = await query(database.url, snapshot);

    const { status } = loadFakeData(database.url);

    expect([status, await query(database.url, snapshot)]).toEqual([0, before]);
  });

  /** A boat is in one place at a time: each trip starts where its previous one ended. */
  it("never has a boat leaving a port it isn't at", async () => {
    const [trips] = await query<{ count: number }>(
      database.url,
      `SELECT count(*)::int AS count FROM trips`,
    );
    const impossibleMoves = await query(
      database.url,
      `SELECT boat_id, departs_at
       FROM (
         SELECT trips.boat_id, trips.departs_at, routes.origin_port_id,
                lag(routes.destination_port_id) OVER boat_days AS previous_port,
                lag(trips.arrives_at) OVER boat_days AS previous_arrival
         FROM trips JOIN routes ON routes.id = trips.route_id
         WINDOW boat_days AS (PARTITION BY trips.boat_id ORDER BY trips.departs_at)
       ) moves
       WHERE origin_port_id <> previous_port OR departs_at < previous_arrival`,
    );

    expect([trips!.count, impossibleMoves]).toEqual([TRIPS_A_DAY * DAYS_AHEAD, []]);
  });

  /** Fake ports and fares must never reach real travellers, so forgetting the setting is safe. */
  it('refuses to run unless fake data is allowed', async () => {
    const productionLike = await createMigratedTestDatabase();
    try {
      const { status, output } = loadFakeData(productionLike.url, '');

      expect([status, output, await query(productionLike.url, `SELECT id FROM ports`)]).toEqual([
        1,
        expect.stringContaining('ALLOW_FAKE_DATA'),
        [],
      ]);
    } finally {
      await productionLike.drop();
    }
  });
});
