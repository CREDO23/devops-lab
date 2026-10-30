import { connection } from 'next/server';

export async function GET(): Promise<Response> {
  // Never checks the API: its outage must not take the website offline, pages show an error.
  await connection();
  return Response.json({ status: 'ready' });
}
