-- migrate:up
CREATE TYPE booking_status AS ENUM (
  'PENDING_PAYMENT',
  'CONFIRMED',
  'FAILED',
  'EXPIRED',
  'PAID_AFTER_EXPIRY'
);

CREATE TYPE language AS ENUM ('en', 'fr', 'sw');

CREATE TABLE ports (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  name text NOT NULL UNIQUE
);

CREATE TABLE routes (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  origin_port_id uuid NOT NULL REFERENCES ports,
  destination_port_id uuid NOT NULL REFERENCES ports,
  fare_cents integer NOT NULL CHECK (fare_cents > 0),
  UNIQUE (origin_port_id, destination_port_id),
  CHECK (origin_port_id <> destination_port_id)
);

CREATE TABLE boats (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  name text NOT NULL UNIQUE,
  seat_rows integer NOT NULL CHECK (seat_rows > 0),
  -- The aisle runs down the middle of the seat map.
  seat_columns integer NOT NULL CHECK (seat_columns > 0 AND seat_columns % 2 = 0)
);

CREATE TABLE trips (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  route_id uuid NOT NULL REFERENCES routes,
  boat_id uuid NOT NULL REFERENCES boats,
  departs_at timestamptz NOT NULL,
  arrives_at timestamptz NOT NULL,
  UNIQUE (boat_id, departs_at),
  CHECK (arrives_at > departs_at)
);

CREATE TABLE bookings (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  reference text NOT NULL UNIQUE,
  trip_id uuid NOT NULL REFERENCES trips,
  seat text NOT NULL,
  phone text NOT NULL,
  language language NOT NULL,
  -- Copied from the route: a later fare change must not rewrite what was charged.
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  -- Reused on every retry: the provider rejects a repeat, so a retry can't charge twice.
  payment_reference uuid NOT NULL UNIQUE,
  status booking_status NOT NULL DEFAULT 'PENDING_PAYMENT',
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Only these two statuses hold a seat: a failed or expired booking releases it.
CREATE UNIQUE INDEX one_active_booking_per_seat ON bookings (trip_id, seat)
  WHERE status IN ('PENDING_PAYMENT', 'CONFIRMED');

CREATE TABLE tickets (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  booking_id uuid NOT NULL UNIQUE REFERENCES bookings,
  sms_sent_at timestamptz,
  pdf_location text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- migrate:down
DROP TABLE tickets;
DROP TABLE bookings;
DROP TABLE trips;
DROP TABLE boats;
DROP TABLE routes;
DROP TABLE ports;
DROP TYPE language;
DROP TYPE booking_status;
