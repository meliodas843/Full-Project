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

test("each question and variant in knowledge.json gets its own answer", () => {
  for (const item of json.faq) {
    for (const q of [item.question, ...(item.variants || [])]) {
      assert.equal(ask(q).text, item.answer, `${item.id}: "${q}"`);
    }
  }
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
  assert.equal(reply.answered, false);
  assert.equal(ask("сайн байна уу").answered, true);
});

test("Mongolian typed in Latin answers in Mongolian, even with English words", () => {
  const reply = ask("herhen qr code awah we").text;
  assert.match(reply, /QR/);
  assert.match(reply, /\p{Script=Cyrillic}/u);
  assert.doesNotMatch(reply, /View QR code/);
});

test("\"yaj\" (how) is a filler word, not a keyword", () => {
  assert.match(ask("event yaj uusgeh we").text, /Эвэнт үүсгэх/);
  assert.match(ask("yaj burtguuleh ve").text, /данс төрлөө сонгоно/);
});

test("English questions still use knowledge.md", () => {
  assert.match(ask("Where's my QR ticket?").text, /QR/);
});

test("saved questions hide contact details and group repeats", async () => {
  const { cleanQuestion, questionKey } = await import("../routes/chatbot.routes.js");
  assert.equal(
    cleanQuestion("Миний имэйл bat@gmail.com, утас +976 9909 1442"),
    "Миний имэйл [имэйл], утас [дугаар]",
  );
  assert.equal(cleanQuestion("x".repeat(500)).length, 300);
  assert.equal(questionKey(cleanQuestion("Хэрхэн QR авах вэ??")), questionKey(cleanQuestion("  хэрхэн qr авах вэ ")));
});
