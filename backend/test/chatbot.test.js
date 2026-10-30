import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// The widget exposes its matcher to Node when there is no browser window.
await import("../../public/chatbot/widget.js");
const { parse, match, fromJson } = globalThis.shl;

const read = (file) => readFile(new URL(`../../public/chatbot/${file}`, import.meta.url), "utf8");
const json = JSON.parse(await read("knowledge.json"));
const kb = [...fromJson(json), ...parse(await read("knowledge.md"))];
const fb = json.system_intents.find((i) => i.id === "fallback");
const fallback = { mn: fb.answer, en: "Sorry, I don't know that yet.", chips: fb.quick_replies };
const ask = (q) => match(kb, q, fallback);

test("every knowledge.json answer and link is usable", () => {
  for (const item of [...json.system_intents, ...json.faq]) {
    assert.ok(item.answer?.trim(), item.id);
    if (item.link) assert.match(item.link, /^\/[^\s]*$/, `${item.id} link must be a site path`);
  }
});

test("answers from knowledge.json, typed in Cyrillic or Latin", () => {
  assert.match(ask("сайн байна уу").text, /Registra-гийн туслах/);
  assert.match(ask("nuuts ugee martsan").text, /6 оронтой код/);
  assert.match(ask("Нууц үг ямар шаардлага хангах ёстой вэ?").text, /8 тэмдэгт/);
  assert.match(ask("zoom link").text, /автоматаар үүсч/);
});

test("answers carry their link and quick replies", () => {
  assert.equal(ask("Яаж бүртгүүлэх вэ?").link, "/signup");
  assert.deepEqual(ask("sain uu").chips, json.system_intents[0].quick_replies);
});

test("the welcome buttons each get a real answer", () => {
  for (const label of json.system_intents[0].quick_replies) {
    assert.notEqual(ask(label).text, fallback.mn, label);
  }
});

test("unknown questions get the fallback with its topics", () => {
  const reply = ask("нохой");
  assert.equal(reply.text, fallback.mn);
  assert.deepEqual(reply.chips, fb.quick_replies);
});

test("English questions still use knowledge.md", () => {
  assert.match(ask("Where's my QR ticket?").text, /QR/);
});
