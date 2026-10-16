import test from "node:test";
import assert from "node:assert/strict";
import {
  imageExtension,
  isAllowedImage,
  setUploadHeaders,
  uploadError,
} from "../utils/uploadSafety.js";

function fakeRes() {
  const headers = {};
  return { headers, setHeader: (k, v) => (headers[k.toLowerCase()] = v) };
}

test("only raster image types are allowed", () => {
  for (const type of ["image/png", "image/jpeg", "image/webp", "image/gif"]) {
    assert.equal(isAllowedImage(type), true, type);
  }
  for (const type of ["image/svg+xml", "text/html", "application/pdf", "", undefined]) {
    assert.equal(isAllowedImage(type), false, String(type));
  }
});

test("saved extension comes from the type, never the file name", () => {
  assert.equal(imageExtension("image/png"), ".png");
  assert.equal(imageExtension("IMAGE/JPEG"), ".jpg");
  assert.equal(imageExtension("text/html"), ".jpg");
});

test("active files under /uploads download instead of rendering", () => {
  const html = fakeRes();
  setUploadHeaders(html, "/srv/uploads/news/x.HTML");
  assert.equal(html.headers["content-disposition"], "attachment");
  assert.equal(html.headers["content-security-policy"], "sandbox");
  assert.equal(html.headers["x-content-type-options"], "nosniff");

  const png = fakeRes();
  setUploadHeaders(png, "/srv/uploads/news/x.png");
  assert.equal(png.headers["content-disposition"], undefined);
  assert.equal(png.headers["x-content-type-options"], "nosniff");
});

test("uploadError is a 400 with a visible message", () => {
  const error = uploadError("Only images allowed");
  assert.equal(error.status, 400);
  assert.equal(error.expose, true);
  assert.equal(error.message, "Only images allowed");
});
