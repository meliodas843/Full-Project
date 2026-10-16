import test from "node:test";
import assert from "node:assert/strict";
import roleMiddleware from "../middleware/roleMiddleware.js";

function run(user) {
  let status = null;
  let nextCalled = false;
  const res = { status: (code) => ((status = code), res), json: () => res };
  roleMiddleware(["admin", "super_admin"])({ user }, res, () => (nextCalled = true));
  return { status, nextCalled };
}

test("admins pass", () => {
  assert.deepEqual(run({ role: "super_admin" }), { status: null, nextCalled: true });
  assert.deepEqual(run({ role: "admin" }), { status: null, nextCalled: true });
});

test("normal users are forbidden", () => {
  assert.deepEqual(run({ role: "user" }), { status: 403, nextCalled: false });
});

test("missing user is unauthorized", () => {
  assert.deepEqual(run(undefined), { status: 401, nextCalled: false });
});
