/**
 * Seam: the constraints the database itself enforces, through real SQL.
 *
 * Needs a real PostgreSQL, found through TEST_DATABASE_URL.
 */
import { randomUUID } from 'node:crypto';

import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { type TestDatabase, createMigratedTestDatabase } from './create-test-database.ts';

const UNIQUE_VIOLATION = '23505';
const CHECK_VIOLATION = '23514';

describe('the database constraints', () => {
  let database: TestDatabase;
  let pool: pg.Pool;
  let tripId: string;
  let portIds: [string, string];
  let boatId: string;
  let routeId: string;

  beforeAll(async () => {
    database = await createMigratedTestDatabase();
    pool = new pg.Pool({ connectionString: database.url, max: 25 });
    const ports = await pool.query<{ id: string }>(
      `INSERT INTO ports (name) VALUES ('Goma'), ('Bukavu') RETURNING id`,
    );
    portIds = [ports.rows[0]!.id, ports.rows[1]!.id];
    const route = await pool.query<{ id: string }>(
      `INSERT INTO routes (origin_port_id, destination_port_id, fare_cents)
       VALUES ($1, $2, 3000) RETURNING id`,
      portIds,
    );
    routeId = route.rows[0]!.id;
    const boat = await pool.query<{ id: string }>(
      `INSERT INTO boats (name, seat_rows, seat_columns) VALUES ('Kivu Star', 10, 4) RETURNING id`,
    );
    boatId = boat.rows[0]!.id;
    const trip = await pool.query<{ id: string }>(
      `INSERT INTO trips (route_id, boat_id, departs_at, arrives_at)
       VALUES ($1, $2, '2026-11-07 05:00Z', '2026-11-07 08:00Z') RETURNING id`,
      [routeId, boatId],
    );
    tripId = trip.rows[0]!.id;
  });

  afterAll(async () => {
    await pool.end();
    await database.drop();
  });

  async function book(seat: string, status = 'PENDING_PAYMENT'): Promise<string> {
    const booking = await pool.query<{ id: string }>(
      `INSERT INTO bookings
         (reference, trip_id, seat, phone, language, amount_cents, payment_reference, status, expires_at)
       VALUES ($1, $2, $3, '+243812345678', 'fr', 3000, $4, $5, now() + interval '10 minutes')
       RETURNING id`,
      [`KF-${randomUUID().slice(0, 8)}`, tripId, seat, randomUUID(), status],
    );
    return booking.rows[0]!.id;
  }

  /** A seat already held by an unpaid booking can't be booked again. */
  it('rejects a second active booking on a seat', async () => {
    await book('1A');

    await expect(book('1A')).rejects.toMatchObject({ code: UNIQUE_VIOLATION });
  });

  /** The case that matters: the database decides when people click at the same moment. */
  it('lets exactly one of 20 simultaneous bookings win a seat', async () => {
    const attempts = await Promise.allSettled(Array.from({ length: 20 }, () => book('2A')));

    expect(attempts.filter((attempt) => attempt.status === 'fulfilled')).toHaveLength(1);
  });

  /** A seat released by a failed or expired booking goes back on sale. */
  it.each(['FAILED', 'EXPIRED', 'PAID_AFTER_EXPIRY'])(
    'frees the seat when a booking is %s',
    async (status) => {
      const seat = `3${status[0]}`;
      await book(seat, status);

      await expect(book(seat)).resolves.toBeTypeOf('string');
    },
  );

  /** Retries can run the ticket step twice; only one ticket may exist. */
  it('rejects a second ticket for a booking', async () => {
    const bookingId = await book('4A', 'CONFIRMED');
    await pool.query(`INSERT INTO tickets (booking_id) VALUES ($1)`, [bookingId]);

    await expect(
      pool.query(`INSERT INTO tickets (booking_id) VALUES ($1)`, [bookingId]),
    ).rejects.toMatchObject({ code: UNIQUE_VIOLATION });
  });

  /** The reference is read aloud at the port, so it must point to one booking only. */
  it('rejects a reference already in use', async () => {
    const insert = `INSERT INTO bookings
        (reference, trip_id, seat, phone, language, amount_cents, payment_reference, expires_at)
      VALUES ('KF-SAME', $1, $2, '+243812345678', 'fr', 3000, $3, now())`;
    await pool.query(insert, [tripId, '5A', randomUUID()]);

    await expect(pool.query(insert, [tripId, '5B', randomUUID()])).rejects.toMatchObject({
      code: UNIQUE_VIOLATION,
    });
  });

  /** A route from a port to itself is a typing mistake in the timetable. */
  it('rejects a route from a port to itself', async () => {
    await expect(
      pool.query(
        `INSERT INTO routes (origin_port_id, destination_port_id, fare_cents) VALUES ($1, $1, 3000)`,
        [portIds[0]],
      ),
    ).rejects.toMatchObject({ code: CHECK_VIOLATION });
  });

  /** A trip that arrives before it leaves would show nonsense on every ticket. */
  it('rejects a trip arriving before it departs', async () => {
    await expect(
      pool.query(
        `INSERT INTO trips (route_id, boat_id, departs_at, arrives_at)
         VALUES ($1, $2, '2026-11-08 08:00Z', '2026-11-08 05:00Z')`,
        [routeId, boatId],
      ),
    ).rejects.toMatchObject({ code: CHECK_VIOLATION });
  });

  /** The seat map puts the aisle in the middle, so columns must split evenly. */
  it('rejects a boat with an odd number of columns', async () => {
    await expect(
      pool.query(`INSERT INTO boats (name, seat_rows, seat_columns) VALUES ('Odd', 10, 3)`),
    ).rejects.toMatchObject({ code: CHECK_VIOLATION });
  });
});
