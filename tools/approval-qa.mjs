#!/usr/bin/env node
/**
 * approval-qa.mjs — prove the approval safety gate against the RUNNING application.
 *
 *   node tools/approval-qa.mjs
 *
 * This drives the same HTTP API the UI drives, so it verifies the real behaviour rather than
 * a unit-test stand-in. The property under test is the one the whole design exists for:
 *
 *   an approval authorises ONE EXACT job, and any material change revokes it.
 *
 * It touches nothing on YouTube. Every call is local; no upload is queued.
 */

const BASE = process.env.BFO_API ?? 'http://127.0.0.1:8787/api';
const ID = process.argv[2] ?? 'airplane-window-hole';

const call = async (method, path, body) => {
  const res = await fetch(`${BASE}${path}`, {
    method, headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : {} };
};

const results = [];
const check = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${name}`);
  if (detail) console.log(`        ${detail}`);
};

console.log(`\nApproval safety QA — ${ID}\n`);

// --- 0. arrange: make the manifest approvable ------------------------------
await call('PATCH', `/content/${ID}/manifest`, {
  metadata: { selectedTitle: 'How Does an Airplane Window Hole Actually Work?', description: 'That tiny hole in your airplane window is supposed to be there. It helps manage the pressure between the layers.' },
  youtube: { privacy: 'private', containsSyntheticMedia: false, madeForKids: false, publishAt: null },
});
let env = (await call('GET', `/content/${ID}/manifest`)).body;
check('manifest is ready to approve', env.readiness.ready, env.readiness.blockers.join(' · '));

// --- 1. approve ------------------------------------------------------------
const approved = await call('POST', `/content/${ID}/approve`);
check('approve succeeds', approved.status === 200, `state=${approved.body?.state}`);
check('approval is valid immediately after approving', approved.body?.approvalCheck?.valid === true);
const hashAtApproval = approved.body?.metadataHash;

// --- 2. change the title by ONE character ----------------------------------
await call('PATCH', `/content/${ID}/manifest`, {
  metadata: { selectedTitle: 'How Does an Airplane Window Hole Actually Work!' },
});
env = (await call('GET', `/content/${ID}/manifest`)).body;
check('title change invalidates the approval',
  env.approvalCheck.valid === false && env.approvalCheck.reason === 'APPROVAL_INVALIDATED',
  `changed: ${env.approvalCheck.changed.join(', ')}`);
check('the invalidation names the field that moved',
  env.approvalCheck.changed.includes('title'), `changed: ${env.approvalCheck.changed.join(', ')}`);
check('state fell back to METADATA_READY', env.state === 'METADATA_READY', `state=${env.state}`);
check('metadata hash actually differs', env.metadataHash !== hashAtApproval);

// --- 3. upload must be refused while unapproved ---------------------------
const blocked = await call('POST', `/content/${ID}/upload`, { confirm: true });
check('upload is refused while approval is invalid',
  blocked.status === 409 && blocked.body?.error?.code === 'APPROVAL_REQUIRED',
  `${blocked.status} ${blocked.body?.error?.code}`);

// --- 4. re-approve, then change the SCHEDULE ------------------------------
const re = await call('POST', `/content/${ID}/approve`);
check('re-approval succeeds', re.body?.approvalCheck?.valid === true);

const future = new Date(Date.now() + 3 * 864e5).toISOString();
await call('PATCH', `/content/${ID}/manifest`, { youtube: { publishAt: future } });
env = (await call('GET', `/content/${ID}/manifest`)).body;
check('publish-time change invalidates the approval',
  env.approvalCheck.valid === false,
  `changed: ${env.approvalCheck.changed.join(', ')}`);
check('the invalidation names the publish time',
  env.approvalCheck.changed.includes('publish time'), `changed: ${env.approvalCheck.changed.join(', ')}`);

// --- 5. restore a clean, unapproved state ---------------------------------
await call('PATCH', `/content/${ID}/manifest`, { youtube: { publishAt: null } });
await call('POST', `/content/${ID}/revoke`);
env = (await call('GET', `/content/${ID}/manifest`)).body;
check('left in an unapproved state', env.approvalCheck.valid === false, `state=${env.state}`);

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
