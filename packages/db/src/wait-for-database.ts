/**
 * Waits for a database to answer (2026-10-26). The serverless SQL databases pause when idle and take up to a minute or two to resume; the first
 * connection after a pause fails with "Can't reach database server". Scheduled jobs call this first so a slow start does not fail the run.
 * Tries every 20 seconds for up to `minutes` (default ten), then throws the last error.
 */
export async function waitForDatabase(name: string, probe: () => Promise<unknown>, minutes = 10): Promise<void> {
  const deadline = Date.now() + minutes * 60_000;
  for (let attempt = 1; ; attempt++) {
    try { await probe(); if (attempt > 1) console.log(`${name} answered on attempt ${attempt}.`); return; }
    catch (e) {
      if (Date.now() > deadline) throw e;
      console.log(`${name} not answering yet (attempt ${attempt}), waiting 20 seconds.`);
      await new Promise((r) => setTimeout(r, 20_000));
    }
  }
}
