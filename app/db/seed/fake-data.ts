/** Invented for development and staging: never production's real fares or timetable. */
export const PORTS = ['Goma', 'Bukavu', 'Idjwi', 'Minova', 'Kalehe'] as const;

export type Port = (typeof PORTS)[number];

export const DAYS_AHEAD = 14;

// Goma to Bukavu is the reported real fare: $30 for about three hours.
export const FARE_CENTS_PER_HOUR = 1000;

export const CROSSINGS: { between: [Port, Port]; minutes: number }[] = [
  { between: ['Goma', 'Bukavu'], minutes: 180 },
  { between: ['Bukavu', 'Minova'], minutes: 150 },
  { between: ['Bukavu', 'Kalehe'], minutes: 150 },
  { between: ['Bukavu', 'Idjwi'], minutes: 150 },
  { between: ['Goma', 'Kalehe'], minutes: 90 },
  { between: ['Goma', 'Idjwi'], minutes: 90 },
  { between: ['Goma', 'Minova'], minutes: 60 },
  { between: ['Minova', 'Kalehe'], minutes: 60 },
  { between: ['Minova', 'Idjwi'], minutes: 60 },
  { between: ['Kalehe', 'Idjwi'], minutes: 60 },
];

export interface FakeBoat {
  name: string;
  seatRows: number;
  seatColumns: number;
  departures: { from: Port; at: string }[];
  endsAt: Port;
}

// Each boat ends its day where it started, so the same journey repeats every day.
export const BOATS: FakeBoat[] = [
  {
    name: 'Kivu Star',
    seatRows: 10,
    seatColumns: 4,
    departures: [
      { from: 'Goma', at: '07:00' },
      { from: 'Bukavu', at: '10:30' },
      { from: 'Goma', at: '14:00' },
      { from: 'Bukavu', at: '17:30' },
    ],
    endsAt: 'Goma',
  },
  {
    name: 'Idjwi Express',
    seatRows: 10,
    seatColumns: 4,
    departures: [
      { from: 'Goma', at: '10:30' },
      { from: 'Bukavu', at: '14:00' },
    ],
    endsAt: 'Goma',
  },
  {
    name: 'Minova Queen',
    seatRows: 8,
    seatColumns: 4,
    departures: [
      { from: 'Goma', at: '07:30' },
      { from: 'Minova', at: '09:00' },
      { from: 'Kalehe', at: '10:30' },
      { from: 'Goma', at: '12:30' },
      { from: 'Kalehe', at: '14:30' },
      { from: 'Minova', at: '16:00' },
    ],
    endsAt: 'Goma',
  },
  {
    name: 'Kalehe Spirit',
    seatRows: 8,
    seatColumns: 4,
    departures: [
      { from: 'Goma', at: '08:00' },
      { from: 'Idjwi', at: '10:00' },
      { from: 'Kalehe', at: '11:30' },
      { from: 'Bukavu', at: '14:30' },
      { from: 'Kalehe', at: '17:30' },
      { from: 'Idjwi', at: '19:00' },
    ],
    endsAt: 'Goma',
  },
  {
    name: 'Bukavu Swift',
    seatRows: 8,
    seatColumns: 4,
    departures: [
      { from: 'Bukavu', at: '06:00' },
      { from: 'Minova', at: '09:00' },
      { from: 'Idjwi', at: '10:30' },
      { from: 'Bukavu', at: '13:30' },
      { from: 'Idjwi', at: '16:30' },
      { from: 'Minova', at: '18:00' },
    ],
    endsAt: 'Bukavu',
  },
];
