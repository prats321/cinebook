import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer } from './helpers.js';
import { createMovie, createTheatre } from './fixtures.js';

let ctx;
let Show;
let ensureUpcomingShows;
let DAYS_AHEAD;
before(async () => {
  ctx = await startTestServer();
  ({ Show } = await import('../src/models/Show.js'));
  ({ ensureUpcomingShows, DAYS_AHEAD } = await import('../src/services/showScheduler.service.js'));
  await createMovie({ runtime: 150 });
  await createMovie({ runtime: 120 });
  await createTheatre();
  await createTheatre({ city: 'Mumbai' });
});
after(() => ctx.stop());

async function overlaps() {
  const shows = await Show.find().sort({ screenId: 1, startTime: 1 }).lean();
  let count = 0;
  for (let i = 1; i < shows.length; i++) {
    const same = String(shows[i].screenId) === String(shows[i - 1].screenId);
    if (same && shows[i].startTime < shows[i - 1].endTime) count++;
  }
  return count;
}

describe('show scheduler', () => {
  it('fills every future slot for the next week', async () => {
    const added = await ensureUpcomingShows();
    const max = 2 /* screens */ * 4 /* slots */ * DAYS_AHEAD;
    assert.ok(added > max - 2 * 4 && added <= max, `added ${added}, expected close to ${max}`);
    assert.equal(await Show.countDocuments({ startTime: { $lte: new Date() } }), 0, 'never in the past');
  });

  it('is idempotent', async () => {
    assert.equal(await ensureUpcomingShows(), 0);
  });

  it('refills a slot that was freed', async () => {
    const victim = await Show.findOne({ startTime: { $gt: new Date(Date.now() + 2 * 86_400_000) } });
    await Show.deleteOne({ _id: victim._id });
    assert.equal(await ensureUpcomingShows(), 1);
    assert.ok(await Show.exists({ screenId: victim.screenId, startTime: victim.startTime }));
  });

  it("never squeezes a show in next to one an admin scheduled by hand", async () => {
    const slot = await Show.findOne({ startTime: { $gt: new Date(Date.now() + 3 * 86_400_000) } });
    await Show.deleteOne({ _id: slot._id });
    const start = new Date(slot.startTime.getTime() + 30 * 60_000);
    await Show.create({ ...slot.toObject(), _id: undefined, startTime: start, endTime: new Date(start.getTime() + 150 * 60_000) });

    assert.equal(await ensureUpcomingShows(), 0);
    assert.equal(await overlaps(), 0);
  });
});
