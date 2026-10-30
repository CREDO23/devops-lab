/** Fills a development or staging database with fake data; running it again only adds new days. */
import pg from 'pg';

import {
  BOATS,
  CROSSINGS,
  DAYS_AHEAD,
  FARE_CENTS_PER_HOUR,
  type Port,
  PORTS,
} from './fake-data.ts';

const GOMA_UTC_OFFSET_MS = 2 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function upcomingGomaDates(): string[] {
  const gomaNow = Date.now() + GOMA_UTC_OFFSET_MS;
  return Array.from({ length: DAYS_AHEAD }, (_, day) =>
    new Date(gomaNow + day * DAY_MS).toISOString().slice(0, 10),
  );
}

function crossingMinutes(from: Port, to: Port): number {
  const crossing = CROSSINGS.find(({ between }) => between.includes(from) && between.includes(to));
  if (!crossing) throw new Error(`No crossing between ${from} and ${to}`);
  return crossing.minutes;
}

async function addPorts(client: pg.Client): Promise<void> {
  for (const name of PORTS) {
    await client.query(`INSERT INTO ports (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`, [
      name,
    ]);
  }
}

async function addRoutes(client: pg.Client): Promise<void> {
  for (const { between, minutes } of CROSSINGS) {
    const fareCents = (minutes / 60) * FARE_CENTS_PER_HOUR;
    for (const [origin, destination] of [between, [...between].reverse()]) {
      await client.query(
        `INSERT INTO routes (origin_port_id, destination_port_id, fare_cents)
         SELECT origin.id, destination.id, $3
         FROM ports origin, ports destination
         WHERE origin.name = $1 AND destination.name = $2
         ON CONFLICT (origin_port_id, destination_port_id) DO NOTHING`,
        [origin, destination, fareCents],
      );
    }
  }
}

async function addBoats(client: pg.Client): Promise<void> {
  for (const { name, seatRows, seatColumns } of BOATS) {
    await client.query(
      `INSERT INTO boats (name, seat_rows, seat_columns) VALUES ($1, $2, $3)
       ON CONFLICT (name) DO NOTHING`,
      [name, seatRows, seatColumns],
    );
  }
}

async function addTrips(client: pg.Client): Promise<void> {
  for (const date of upcomingGomaDates()) {
    for (const boat of BOATS) {
      for (const [index, { from, at }] of boat.departures.entries()) {
        const to = boat.departures[index + 1]?.from ?? boat.endsAt;
        const departsAt = new Date(`${date}T${at}:00+02:00`);
        const arrivesAt = new Date(departsAt.getTime() + crossingMinutes(from, to) * 60 * 1000);
        await client.query(
          `INSERT INTO trips (route_id, boat_id, departs_at, arrives_at)
           SELECT routes.id, boats.id, $4, $5
           FROM routes
           JOIN ports origin ON origin.id = routes.origin_port_id
           JOIN ports destination ON destination.id = routes.destination_port_id
           JOIN boats ON boats.name = $3
           WHERE origin.name = $1 AND destination.name = $2
           ON CONFLICT (boat_id, departs_at) DO NOTHING`,
          [from, to, boat.name, departsAt, arrivesAt],
        );
      }
    }
  }
}

if (process.env.ALLOW_FAKE_DATA !== 'true') {
  console.error('Refusing to load fake data: ALLOW_FAKE_DATA is not true');
  process.exit(1);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query('BEGIN');
  await addPorts(client);
  await addRoutes(client);
  await addBoats(client);
  await addTrips(client);
  await client.query('COMMIT');
} finally {
  await client.end();
}
console.log(`Fake data loaded for the next ${DAYS_AHEAD} days`);
