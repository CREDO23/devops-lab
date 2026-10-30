/** Next.js calls register() once when the server starts, before it handles any request. */
export async function register(): Promise<void> {
  // Next.js also calls it for its Edge runtime, which has no process to exit or watch.
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { logLifecycle } = await import('@/lifecycle-logs');
    logLifecycle();
  }
}
