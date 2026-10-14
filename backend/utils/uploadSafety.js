import path from "path";

// Raster image types users may upload, mapped to the extension we save them
// with. SVG is excluded on purpose: it can carry scripts.
export const IMAGE_EXTENSIONS = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

export function isAllowedImage(mimetype) {
  return Object.hasOwn(IMAGE_EXTENSIONS, String(mimetype || "").toLowerCase());
}

// Never trust the uploaded file name's extension: "x.html" labelled as
// image/png would otherwise be saved, and later served, as HTML.
export function imageExtension(mimetype) {
  return IMAGE_EXTENSIONS[String(mimetype || "").toLowerCase()] || ".jpg";
}

// Extensions a browser would run as a page or script if opened directly.
const ACTIVE_EXTENSIONS = new Set([
  ".html",
  ".htm",
  ".xhtml",
  ".shtml",
  ".svg",
  ".svgz",
  ".xml",
  ".xsl",
  ".js",
  ".mjs",
]);

// express.static setHeaders for /uploads: stop content sniffing, and make any
// file with an active extension download instead of rendering on our origin.
export function setUploadHeaders(res, filePath) {
  res.setHeader("X-Content-Type-Options", "nosniff");

  if (ACTIVE_EXTENSIONS.has(path.extname(filePath).toLowerCase())) {
    res.setHeader("Content-Disposition", "attachment");
    res.setHeader("Content-Security-Policy", "sandbox");
  }
}
