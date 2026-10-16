import test from "node:test";
import assert from "node:assert/strict";
import { getEventAccess } from "../utils/eventAccess.js";

// Minimal stand-in for a mysql2 pool: answers by matching the SQL text.
function fakePool({ event = null, finished = null, booked = false, archivedMember = false }) {
  return {
    async query(sql) {
      if (/FROM events\b/.test(sql)) return [[event].filter(Boolean)];
      if (/FROM finished_event\b/.test(sql)) return [[finished].filter(Boolean)];
      if (/FROM event_bookings/.test(sql)) return [[booked ? { ok: 1 } : undefined].filter(Boolean)];
      if (/FROM finished_event_participants/.test(sql)) return [[archivedMember ? { ok: 1 } : undefined].filter(Boolean)];
      if (/FROM users/.test(sql)) return [[{ id: 7 }]];
      throw new Error(`unexpected query: ${sql}`);
    },
  };
}

const publicEvent = { created_by_email: "owner@x.mn", visibility: "public", archived: 0 };
const privateEvent = { created_by_email: "owner@x.mn", visibility: "private", archived: 0 };
const guest = { id: 7, email: "guest@x.mn", role: "user" };

test("unknown event does not exist", async () => {
  const access = await getEventAccess(fakePool({}), 1, guest);
  assert.equal(access.exists, false);
});

test("creator is a member (email match, case-insensitive)", async () => {
  const access = await getEventAccess(fakePool({ event: privateEvent }), 1, { id: 1, email: "OWNER@x.mn" });
  assert.equal(access.isMember, true);
});

test("someone who joined is a member", async () => {
  const access = await getEventAccess(fakePool({ event: privateEvent, booked: true }), 1, guest);
  assert.equal(access.isMember, true);
});

test("outsider is not a member; public flag reflects visibility", async () => {
  const pub = await getEventAccess(fakePool({ event: publicEvent }), 1, guest);
  assert.deepEqual([pub.isMember, pub.isPublic], [false, true]);

  const priv = await getEventAccess(fakePool({ event: privateEvent }), 1, guest);
  assert.deepEqual([priv.isMember, priv.isPublic], [false, false]);
});

test("finished event: archived participant is a member", async () => {
  const access = await getEventAccess(
    fakePool({ finished: { created_by_email: "owner@x.mn", visibility: "public" }, archivedMember: true }),
    1,
    guest,
  );
  assert.equal(access.exists, true);
  assert.equal(access.isMember, true);
});

test("admins can see everything", async () => {
  const access = await getEventAccess(fakePool({ event: privateEvent }), 1, { id: 9, email: "a@x.mn", role: "super_admin" });
  assert.equal(access.isMember, true);
});
