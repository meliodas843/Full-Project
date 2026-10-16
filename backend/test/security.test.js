import test from "node:test";
import assert from "node:assert/strict";
import { errorHandler, hideServerErrors } from "../utils/security.js";
import { uploadError } from "../utils/uploadSafety.js";

function fakeRes(statusCode = 200) {
  const res = {
    statusCode,
    headersSent: false,
    body: undefined,
    status(code) {
      res.statusCode = code;
      return res;
    },
    json(body) {
      res.body = body;
      return res;
    },
  };
  return res;
}

test("5xx responses drop internal error details", () => {
  const res = fakeRes(500);
  hideServerErrors({}, res, () => {});
  res.json({ message: "Server error", error: "ER_ACCESS_DENIED", sqlMessage: "x" });
  assert.deepEqual(res.body, { message: "Server error" });
});

test("4xx responses are passed through unchanged", () => {
  const res = fakeRes(400);
  hideServerErrors({}, res, () => {});
  res.json({ message: "Bad", error: "detail" });
  assert.deepEqual(res.body, { message: "Bad", error: "detail" });
});

test("rejected uploads become 400 with their message", () => {
  const res = fakeRes();
  errorHandler(uploadError("Only images allowed"), { method: "POST", originalUrl: "/x" }, res, () => {});
  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, { message: "Only images allowed" });
});

test("multer errors become 400", () => {
  const res = fakeRes();
  const err = Object.assign(new Error("File too large"), { name: "MulterError" });
  errorHandler(err, { method: "POST", originalUrl: "/x" }, res, () => {});
  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, { message: "File too large" });
});

test("unexpected errors become a generic 500 without the message", () => {
  const res = fakeRes();
  const original = console.error;
  console.error = () => {};
  try {
    errorHandler(new Error("ENOENT /srv/secret/path"), { method: "GET", originalUrl: "/x" }, res, () => {});
  } finally {
    console.error = original;
  }
  assert.equal(res.statusCode, 500);
  assert.deepEqual(res.body, { message: "Server error" });
});
