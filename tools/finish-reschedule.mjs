/**
 * finish-reschedule.mjs — complete the Seoul-anchored correction in one command.
 *
 * The correction ran out of daily YouTube quota partway through: ten uploads at 1,600 units
 * each had already spent well past the 10,000/day allowance before the schedule change began.
 * Everything here is idempotent, so this is safe to run repeatedly and will simply do whatever
 * remains.
 *
 * Order matters. The schedule moves first, then the analytics checkpoints are rebuilt FROM the
 * live publish times -- rebuilding them first would key them to instants that are about to
 * change.
 *
 *   node tools/finish-reschedule.mjs
 *
 * Quota resets at 00:00 America/Los_Angeles.
 */

import { spawnSync } from 'node:child_process';

const step = (label, args) => {
  console.log(`\n=== ${label} ===`);
  const r = spawnSync(process.execPath, args, { stdio: 'inherit' });
  if (r.status === 2) {
    console.log(`\n${label} stopped on quota. Re-run this command after the reset.\n`);
    process.exit(2);
  }
  if (r.status !== 0) {
    console.log(`\n${label} failed with exit ${r.status}.\n`);
    process.exit(r.status ?? 1);
  }
};

step('reschedule', ['tools/reschedule-batch.mjs']);
step('analytics checkpoints', ['tools/schedule-snapshots.mjs']);

console.log('\n=== done ===');
console.log('All remaining videos are at their Seoul-anchored times and the checkpoints match.\n');
