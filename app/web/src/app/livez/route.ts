import { connection } from 'next/server';

export async function GET(): Promise<Response> {
  // Answered live, not prerendered at build time: it must prove this process responds.
  await connection();
  return Response.json({ status: 'alive' });
}
