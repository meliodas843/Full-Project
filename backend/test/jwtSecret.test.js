import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const modulePath = fileURLToPath(new URL("../utils/jwtSecret.js", import.meta.url));

function load(secret) {
  // Run in a child process with a clean env so dotenv/.env can't fill it in.
  return spawnSync(
    process.execPath,
    ["--input-type=module", "-e", `await import(${JSON.stringify(modulePath)}); console.log("loaded");`],
    { env: { PATH: process.env.PATH, JWT_SECRET: secret, DOTENV_CONFIG_PATH: "/nonexistent" }, encoding: "utf8" },
  );
}

test("refuses to start without a JWT secret", () => {
  const result = load("");
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /JWT_SECRET is not set/);
});

test("refuses the old default secret", () => {
  assert.notEqual(load("dev_secret_change_me").status, 0);
});

test("loads with a real secret", () => {
  const result = load("a-long-random-secret");
  assert.equal(result.status, 0);
  assert.match(result.stdout, /loaded/);
});
