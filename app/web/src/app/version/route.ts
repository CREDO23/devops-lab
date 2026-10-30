import { runningVersion } from '@/version';

export function GET(): Response {
  return Response.json({ version: runningVersion() });
}
