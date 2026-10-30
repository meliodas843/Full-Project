// Registra's chat assistant "Шилүүс". Loaded from index.html; its files live
// next to it in /chatbot/. Matcher: no AI. Picks the entry sharing the most
// words with the question, in Mongolian or English. Answers come from
// knowledge.json (the Q&A, tried first) and knowledge.md (bilingual extras).

// Mongolian typed in Latin letters ("herhen vvsgeh we") → Cyrillic. Digraphs first.
const LAT = [["sh", "ш"], ["ch", "ч"], ["ts", "ц"], ["kh", "х"], ["ya", "я"], ["yu", "ю"], ["yo", "ё"], ["ye", "е"],
  ["a", "а"], ["b", "б"], ["c", "ц"], ["d", "д"], ["e", "э"], ["f", "ф"], ["g", "г"], ["h", "х"], ["i", "и"], ["j", "ж"],
  ["k", "к"], ["l", "л"], ["m", "м"], ["n", "н"], ["o", "о"], ["p", "п"], ["q", "ө"], ["r", "р"], ["s", "с"], ["t", "т"],
  ["u", "у"], ["v", "ү"], ["w", "в"], ["x", "х"], ["y", "й"], ["z", "з"]];
const FOLD = { ө: "о", ү: "у", в: "у", е: "э", ё: "о", ы: "и", й: "и", ъ: "", ь: "" }; // letters people mix up when typing
const mnWord = (w) => LAT.reduce((t, [l, c]) => t.replaceAll(l, c), w).replace(/[өүвеёыйъь]/g, (c) => FOLD[c]);
const MN_STOP = new Set(["гэж", "юу", "вэ", "бэ", "уу", "үү", "юм", "бол", "ямар", "хэрхэн", "яаж", "яж", "хэд", "байна", "та", "би", "энэ", "тэр", "ээ", "нь", "уу", "болох", "вэ", "гэдэг", "хэн",
  // suffixes split off by a hyphen (Registra-ийн)
  "ийн", "ын", "ний", "д", "т", "аас", "ээс", "оос", "өөс", "тай", "тэй", "той", "ыг", "ийг", "г", "руу", "рүү", "дээр",
  "регистра", "registra", "mn"].map(mnWord)); // the whole bot is about Registra, so its name tells nothing
// Latin words that only Mongolian uses: "registra gej yu we" is Mongolian, "check in" is not
const MN_HINT = new Set(["gej", "yu", "yuu", "we", "ve", "be", "uu", "vv", "bol", "yamar", "herhen", "yaaj", "yaj", "hed", "baina", "yum", "ni", "deer", "haana", "hezee"]);
const EN_STOP = new Set(["what", "is", "the", "a", "an", "how", "do", "does", "i", "you", "to", "of", "for", "can", "my", "me", "your", "are", "it", "in", "on", "and", "or", "with", "about", "please", "there", "who", "registra", "mn"]);
const words = (s) => s.toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
// stop = drop filler words; a question made only of filler ("юу байна", "what can you do") keeps them all
const keep = (ws, stop) => (ws.some((w) => !stop?.has(w)) ? ws.filter((w) => !stop?.has(w)) : ws);
const mnStems = (s, stop = MN_STOP) => keep(words(s).map(mnWord).filter((w) => w.length > 1), stop);
const enStems = (s, stop = EN_STOP) => keep(words(s).filter((w) => /^[a-z0-9]+$/.test(w) && w.length > 1), stop);

// Entry format: "## mn question | keywords", optional "EN: en question | keywords", mn answer, "---", en answer.
function parse(md) {
  return md.split(/^## /m).slice(1).map((block) => {
    const lines = block.split("\n");
    const head = lines.shift();
    const enHead = /^EN:/.test(lines[0]) ? lines.shift().slice(3) : "";
    const [mn = "", en = ""] = lines.join("\n").split(/^---\s*$/m).map((t) => t.trim());
    return {
      mn, en: en || mn,
      mnKeys: mnStems(head, null), mnBody: mnStems(mn),
      // Latin words on the "##" line count as Mongolian when an EN: line exists
      enKeys: enStems(enHead || head, null), enBody: enStems(en),
    };
  });
}

// knowledge.json: { system_intents: [...], faq: [...] }, each with an answer,
// optional variants, link and quick_replies. Mongolian only, so the English
// reply is the same text.
function fromJson(data) {
  const items = [...(data?.system_intents || []), ...(data?.faq || [])].filter((i) => i.id !== "fallback" && i.answer);
  return items.map((i) => {
    const head = [i.question || "", (i.variants || []).join(", ")].join(" | ");
    return {
      mn: i.answer, en: i.answer, link: i.link || "", chips: i.quick_replies || [],
      mnKeys: mnStems(head, null), mnBody: mnStems(i.answer),
      enKeys: enStems(head, null), enBody: [],
    };
  });
}

// one typo/missing letter apart ("evnt" ≈ "эвэнт", "regstra" ≈ "registra")
function near(a, b) {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}
// shortcut: first 5 letters ≈ stem (Registra-д / Registra-ийн / prices match), upgrade to a real stemmer if matches get noisy
const stem = (w) => w.slice(0, 5);
const same = (w, list) => list.some((k) => stem(k) === stem(w));
// shortcut: stem, prefix or 1-edit fuzzy match on whole words, upgrade to a scored fuzzy matcher if short words start colliding
const hit = (w, list) => list.some((k) => stem(k) === stem(w) ||
  (w.length >= 3 && k.length >= 3 && (k.startsWith(w) || w.startsWith(k))) ||
  (w.length >= 4 && k.length >= 4 && near(w, k)));
// exact keyword 4 > same stem 3 > partial keyword 2 > word in the answer 1
const score = (q, keys, body) => q.reduce((n, w) => n + (keys.includes(w) ? 4 : same(w, keys) ? 3 : hit(w, keys) ? 2 : hit(w, body) ? 1 : 0), 0);
const FALLBACK = {
  mn: "Уучлаарай, үүнийг одоохондоо мэдэхгүй байна. 🐾 support@registra.mn эсвэл +976 99091442 руу хандаарай.\nЖишээ нь асуугаарай: «Эвэнт хэрхэн үүсгэх вэ?», «Үнэ хэд вэ?», «QR тасалбар хаана?»",
  en: "Sorry, I don't know that yet. 🐾 Please contact support@registra.mn or +976 99091442.\nTry asking: \"How do I create an event?\", \"How much is it?\", \"Where is my QR ticket?\"",
};

// Most of the question has to be about the entry: "Паркинг хаана байдаг вэ"
// shares only "байдаг" with the pricing answer, so it is not answered. Counts
// question words hitting the entry's keywords in either language.
// Latin words may be Mongolian ("une", "evnt uusgeh"), so they are tried both ways.
// Question words like "when", "work" don't need to match.
const WEAK = new Set(["when", "where", "why", "which", "get", "work", "works", "much", "many"]);
function covers(entry, question, mn) {
  const q = keep(mn ? mnStems(question) : enStems(question), WEAK);
  const mnKeys = [...entry.mnKeys, ...entry.enKeys.map(mnWord)];
  const ok = (w) => hit(w, entry.enKeys) || hit(mnWord(w), mnKeys);
  return q.filter(ok).length * 2 > q.length;
}

// The best entry for a question: { text, link, chips }. Falls back when
// nothing matches or the answer is still a [TODO].
function match(entries, question, fallback = FALLBACK) {
  const cyr = /\p{Script=Cyrillic}/u.test(question);
  const mnFirst = cyr || words(question).some((w) => MN_HINT.has(w));
  const q = { mn: mnStems(question), en: cyr ? enStems(question).filter((w) => !EN_STOP.has(w)) : enStems(question) };
  let best = null, lang = mnFirst ? "mn" : "en", top = 0;
  for (const e of entries) {
    const s = { en: score(q.en, e.enKeys, e.enBody), mn: score(q.mn, e.mnKeys, e.mnBody) };
    // A Mongolian question (Cyrillic, or Latin like "herhen qr code awah we") answers in Mongolian
    // even when its matching words are English ("Бүртгэл / Account", "qr code").
    if (mnFirst) [s.mn, s.en] = [s.mn + s.en, 0];
    for (const l of mnFirst ? ["mn", "en"] : ["en", "mn"]) if (s[l] > top) [best, lang, top] = [e, l, s[l]]; // first language wins ties
  }
  const reply = best?.[lang];
  if (reply && !reply.includes("[TODO") && covers(best, question, mnFirst)) return { text: reply, link: best.link || "", chips: best.chips || [], answered: true }; // unfilled answers are never shown
  return { text: fallback[lang], link: "", chips: lang === "mn" ? fallback.chips || [] : [], answered: false };
}

const answer = (entries, question) => match(entries, question).text;

if (typeof window === "undefined") globalThis.shl = { parse, answer, match, fromJson }; // for node tests
else (() => {
  // Folder this script was loaded from, e.g. https://registra.mn/chatbot/
  const BASE = new URL(".", document.currentScript.src).href;
  const load = (file, as) => fetch(`${BASE}${file}`, { cache: "no-cache" }).then((r) => (r.ok ? r[as]() : null)).catch(() => null);
  const sources = Promise.all([load("knowledge.json", "json"), load("knowledge.md", "text")]);
  const knowledge = sources.then(([json, md]) => [...fromJson(json), ...(md ? parse(md) : [])]);
  const fallback = sources.then(([json]) => {
    const fb = (json?.system_intents || []).find((i) => i.id === "fallback");
    return fb ? { ...FALLBACK, mn: fb.answer, chips: fb.quick_replies || [] } : FALLBACK;
  });
  const greeting = sources.then(([json]) => (json?.system_intents || []).find((i) => i.id === "greeting"));
  const CHIPS = ["Эвэнт хайх", "Хэрхэн бүртгүүлэх вэ?", "Zoom уулзалт гэж юу вэ?", "Эвэнт зарлах"];
  // Pages where the bubble would get in the way (admin, sign-in, QR scanner).
  const HIDDEN = [/^\/super-admin/, /^\/(login|signup|forgot-password|reset-password)\/?$/, /\/checkin\/?$/];
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Registra already loads Manrope; everything else is sealed in a shadow root so the site's CSS can't leak in.
  const host = Object.assign(document.createElement("div"), { id: "shiluus-chat" });
  document.body.append(host);
  const root = host.attachShadow({ mode: "open" });

  root.innerHTML = `<style>
  :host { all: initial; }
  /* Registra tokens (registra.mn :root). Dark is the site default; .light follows <html data-theme="light"> */
  .wrap { --purple:#5847EE; --violet:#8656EE; --cyan:#26C9E8; --grad:linear-gradient(135deg,#5847EE,#8656EE);
    --bg:#0D1124; --surface:#171C36; --alt:#11162D; --text:#F5F6FF; --muted:#A6AEC8; --border:#303853; }
  .wrap.light { --bg:#F6F7FC; --surface:#FFFFFF; --alt:#F1F3FA; --text:#171B32; --muted:#737D96; --border:#DFE3EF; }
  * { box-sizing: border-box; font-family: Manrope, system-ui, sans-serif; }
  button { font: inherit; }

  .launch { position: fixed; right: 20px; bottom: 20px; z-index: 2147483000; width: 52px; height: 52px; padding: 0;
    border: 0; border-radius: 50%; cursor: pointer; background: #fff url(${BASE}avatar.png) center/cover;
    box-shadow: 0 0 0 2.5px var(--purple), 0 10px 22px -6px rgba(88,71,238,.7); transition: transform .2s; }
  .launch:hover { transform: translateY(-3px); }

  .panel { position: fixed; right: 20px; bottom: 84px; z-index: 2147483000; width: 340px; max-width: calc(100vw - 32px);
    height: min(540px, calc(100vh - 112px)); display: flex; flex-direction: column; overflow: hidden;
    background: var(--bg); color: var(--text); border: 1px solid var(--border); border-radius: 18px;
    box-shadow: 0 28px 64px -16px rgba(13,17,36,.6), 0 0 0 1px rgba(88,71,238,.15);
    transform-origin: bottom right; transition: opacity .22s ease, transform .26s cubic-bezier(.2,.9,.3,1.15), visibility .26s; }
  .panel.closed { opacity: 0; visibility: hidden; transform: translateY(14px) scale(.92); pointer-events: none; }

  /* The ticket: purple stub, perforated tear line, notches cut from both edges */
  header { position: relative; display: flex; align-items: center; gap: 11px; padding: 15px 15px 19px; background: var(--grad); color: #fff; }
  header::after { content: ""; position: absolute; left: 22px; right: 22px; bottom: 0; border-top: 2px dashed rgba(255,255,255,.4); }
  .tear { position: relative; height: 0; }
  .tear::before, .tear::after { content: ""; position: absolute; top: -12px; width: 24px; height: 24px; border-radius: 50%;
    background: var(--bg); border: 1px solid var(--border); }
  .tear::before { left: -13px; } .tear::after { right: -13px; }
  header img { width: 42px; height: 42px; border-radius: 50%; background: #fff; box-shadow: 0 0 0 3px rgba(255,255,255,.85); }
  .name { font-size: 18px; font-weight: 800; letter-spacing: -.01em; line-height: 1.1; }
  .role { margin-top: 2px; font-size: 12.5px; font-weight: 600; color: rgba(255,255,255,.78); }
  .role b { color: #fff; font-weight: 800; }
  .px { position: absolute; display: block; }  /* confetti from registra.mn artwork */
  .close { margin-left: auto; position: relative; width: 32px; height: 32px; border: 0; border-radius: 12px; cursor: pointer;
    color: #fff; background: rgba(255,255,255,.14); display: grid; place-items: center; transition: background .15s; }
  .close:hover { background: rgba(255,255,255,.26); }

  .log { position: relative; flex: 1; overflow-y: auto; padding: 20px 13px 12px; display: flex; flex-direction: column; gap: 10px;
    scrollbar-color: var(--border) transparent; }
  .msg { max-width: 88%; padding: 9px 13px; font-size: 13.5px; line-height: 1.5; white-space: pre-wrap; overflow-wrap: anywhere;
    animation: rise .2s ease-out; }
  .bot { align-self: flex-start; background: var(--surface); border: 1px solid var(--border); border-radius: 4px 16px 16px 16px; }
  .user { align-self: flex-end; background: var(--grad); color: #fff; font-weight: 600; border-radius: 16px 4px 16px 16px;
    box-shadow: 0 8px 18px -10px rgba(88,71,238,.9); }
  @keyframes rise { from { opacity: 0; transform: translateY(6px); } }

  .note { margin-top: -4px; padding-left: 4px; font-size: 11px; color: var(--muted); }

  .more { display: inline-block; margin-top: 8px; color: var(--cyan); font-weight: 800; text-decoration: none; }
  .more:hover { text-decoration: underline; }
  .light .more { color: var(--purple); }

  .typing { display: flex; gap: 5px; padding: 15px 16px; }
  .typing i { width: 7px; height: 7px; border-radius: 2px; background: var(--cyan); animation: blink 1s infinite; }
  .typing i:nth-child(2) { animation-delay: .15s; } .typing i:nth-child(3) { animation-delay: .3s; }
  @keyframes blink { 50% { opacity: .25; transform: translateY(-2px); } }

  .chips { display: flex; flex-wrap: wrap; gap: 8px; padding-left: 2px; animation: rise .2s ease-out; }
  .chip { padding: 7px 10px; border: 1px solid var(--cyan); border-radius: 9px; background: transparent; color: var(--cyan);
    font-size: 12px; font-weight: 800; cursor: pointer; transition: background .15s, color .15s; }
  .chip:hover { background: var(--cyan); color: #0D1124; }
  .light .chip { border-color: var(--purple); color: var(--purple); }
  .light .chip:hover { background: var(--purple); color: #fff; }

  form { display: flex; gap: 7px; padding: 10px; background: var(--alt); border-top: 1px solid var(--border); }
  input { flex: 1; min-width: 0; padding: 10px 13px; border: 1px solid var(--border); border-radius: 13px; background: var(--surface);
    color: var(--text); font: 500 13.5px Manrope, system-ui, sans-serif; outline: none; transition: border-color .15s, box-shadow .15s; }
  input::placeholder { color: var(--muted); }
  input:focus { border-color: var(--purple); box-shadow: 0 0 0 3px rgba(88,71,238,.3); }
  .send { flex: none; width: 40px; height: 40px; border: 0; border-radius: 13px; cursor: pointer; background: var(--grad); color: #fff;
    display: grid; place-items: center; box-shadow: 0 10px 20px -10px rgba(88,71,238,.9); transition: transform .15s; }
  .send:hover { transform: translateY(-1px); }
  .send:disabled { opacity: .45; cursor: default; transform: none; }

  :focus-visible { outline: 2px solid var(--cyan); outline-offset: 3px; }
  input:focus-visible { outline: none; }

  @media (max-width: 480px) {
    .panel { right: 0; bottom: 0; width: 100vw; max-width: none; height: 100dvh; border-radius: 0; border: 0; }
    .open .launch { display: none; }
  }
  @media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
  </style>
  <div class="wrap">
    <section class="panel closed" role="dialog" aria-label="Шилүүс — Registra-ийн туслах" aria-hidden="true">
      <header>
        <span class="px" style="top:11px;right:58px;width:9px;height:9px;border-radius:2px;background:var(--cyan)" aria-hidden="true"></span>
        <span class="px" style="top:26px;right:51px;width:0;height:0;border:5px solid transparent;border-bottom:8px solid rgba(255,255,255,.55);border-top:0" aria-hidden="true"></span>
        <span class="px" style="top:8px;right:46px;width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,.4)" aria-hidden="true"></span>
        <img src="${BASE}avatar.png" alt="">
        <div><div class="name">Шилүүс</div><div class="role"><b>Registra</b>-ийн туслах</div></div>
        <button class="close" aria-label="Хаах">
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>
        </button>
      </header>
      <div class="tear" aria-hidden="true"></div>
      <div class="log" aria-live="polite"></div>
      <form>
        <input placeholder="Асуултаа бичнэ үү / Ask a question" autocomplete="off" maxlength="300" aria-label="Асуулт">
        <button class="send" aria-label="Илгээх">
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M3 9h11M9.5 4.5L14 9l-4.5 4.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      </form>
    </section>
    <button class="launch" aria-label="Шилүүстэй чатлах" aria-expanded="false"></button>
  </div>`;

  const $ = (s) => root.querySelector(s);
  const wrap = $(".wrap"), panel = $(".panel"), log = $(".log"), form = $("form"), input = $("input"), send = $(".send"), launch = $(".launch");

  // follow registra.mn's light/dark toggle (<html data-theme>)
  const syncTheme = () => wrap.classList.toggle("light", document.documentElement.dataset.theme === "light");
  syncTheme();
  new MutationObserver(syncTheme).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  const add = (cls, text, link) => {
    const el = document.createElement("div");
    el.className = `msg ${cls}`; el.textContent = text; // textContent: answers are never rendered as HTML
    if (link) {
      // Only links inside Registra, opened in the same tab.
      const url = new URL(link, location.origin);
      if (url.origin === location.origin) {
        el.append(document.createElement("br"), Object.assign(document.createElement("a"), {
          className: "more", href: url.pathname + url.search + url.hash, textContent: "Дэлгэрэнгүй →",
        }));
      }
    }
    log.append(el); log.scrollTop = log.scrollHeight; return el;
  };

  const addChips = (labels) => {
    if (!labels?.length) return;
    const row = Object.assign(document.createElement("div"), { className: "chips" });
    for (const label of labels) {
      const b = Object.assign(document.createElement("button"), { className: "chip", type: "button", textContent: label });
      b.onclick = () => ask(label);
      row.append(b);
    }
    log.append(row);
  };

  const setOpen = (open, focus = true) => {
    panel.classList.toggle("closed", !open);
    panel.setAttribute("aria-hidden", String(!open));
    wrap.classList.toggle("open", open);
    launch.setAttribute("aria-expanded", String(open));
    if (focus) (open ? input : launch).focus();
  };
  launch.onclick = () => setOpen(panel.classList.contains("closed"));
  $(".close").onclick = () => setOpen(false);
  root.addEventListener("keydown", (e) => { if (e.key === "Escape") setOpen(false); });

  // Every question and the answer given go to the super admin (Чатбот
  // асуултууд). Each question once, at most 30 per visit.
  const reported = new Set();
  const report = (text, reply) => {
    const key = text.toLowerCase().replace(/\s+/g, " ");
    if (reported.has(key) || reported.size >= 30) return;
    reported.add(key);
    if (reported.size === 1) {
      log.append(Object.assign(document.createElement("div"), {
        className: "note", textContent: "Асуултуудыг тань Шилүүсийг сайжруулахад ашиглана.",
      }));
    }
    fetch(new URL("/api/chatbot/questions", BASE), {
      method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true,
      body: JSON.stringify({ question: text, page: location.pathname, answered: reply.answered, answer: reply.answered ? reply.text : "" }),
    }).catch(() => {});
  };

  async function ask(text) {
    send.disabled = true;
    const q = add("user", text);
    const dots = add("bot typing", "");
    dots.innerHTML = "<i></i><i></i><i></i>";
    dots.setAttribute("aria-label", "бичиж байна");
    const [kb, fb] = await Promise.all([knowledge, fallback, new Promise((r) => setTimeout(r, reduceMotion ? 0 : 450))]);
    dots.remove();
    const reply = match(kb, text, fb);
    add("bot", reply.text, reply.link);
    report(text, reply);
    addChips(reply.chips);
    log.scrollTop = q.offsetTop - 12; // long answers: show the question and the start of the reply, not the end
    send.disabled = false;
  }

  add("bot", "Сайн байна уу! 👋 Би Шилүүс — Registra-ийн туслах. Эвэнт хайх, бүртгүүлэх, эвэнт зарлах, 1:1 Zoom уулзалтын талаар асуугаарай.\nHi! Ask me in Mongolian or English.");
  greeting.then((g) => addChips(g?.quick_replies?.length ? g.quick_replies : CHIPS));

  // The site is a single-page app: re-check the page on navigation.
  let lastPath = "";
  const syncPage = () => {
    if (location.pathname === lastPath) return;
    lastPath = location.pathname;
    const hidden = HIDDEN.some((re) => re.test(lastPath));
    host.style.display = hidden ? "none" : "";
    if (hidden) setOpen(false, false);
  };
  syncPage();
  setInterval(syncPage, 600);
  addEventListener("popstate", syncPage);

  form.onsubmit = (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text || send.disabled) return;
    input.value = "";
    ask(text);
  };
})();
