import { useEffect, useMemo, useRef, useState } from "react";
import Footer from "../../components/Footer";

const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE) ||
  (typeof process !== "undefined" && process.env?.REACT_APP_API_BASE) ||
  "http://localhost:5000";

function safeText(v) {
  return String(v ?? "").trim();
}

function toImgUrl(url) {
  const u = safeText(url);
  if (!u) return "";
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  const normalized = u.startsWith("/") ? u : `/${u}`;
  return `${API_BASE}${normalized}`;
}

function fmtDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("mn-MN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function decodeHtmlEntities(str) {
  const s = String(str || "");
  if (typeof window !== "undefined") {
    const txt = document.createElement("textarea");
    txt.innerHTML = s;
    return txt.value;
  }
  return s;
}

function stripHtml(html) {
  const s = decodeHtmlEntities(html);
  return s
    .replace(/<[^>]*>/g, " ")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pickPreview(n) {
  return stripHtml(
    n?.snippet ||
      n?.excerpt ||
      n?.summary ||
      n?.description ||
      n?.desc ||
      n?.body ||
      n?.content ||
      n?.text ||
      "",
  );
}

function getNewsKey(n) {
  return n?.id ?? n?._id ?? n?.slug ?? n?.title ?? Math.random();
}
function AnimatedPrice({ value, prefix = "₮", duration = 450 }) {
  const [display, setDisplay] = useState(value);
  const rafRef = useRef(0);
  const prevRef = useRef(value);

  useEffect(() => {
    const from = prevRef.current;
    const to = value;

    cancelAnimationFrame(rafRef.current);

    // if same value, no animation
    if (from === to) {
      setDisplay(to);
      return;
    }

    const start = performance.now();

    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      const current = Math.round(from + (to - from) * eased);

      setDisplay(current);

      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else prevRef.current = to;
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);

  return (
    <span className="priceNumber">
      {prefix}
      {Number(display).toLocaleString("mn-MN")}
    </span>
  );
}
function getNewsHref(n) {
  const slug = n?.slug;
  const id = n?._id ?? n?.id;
  if (slug) return `/news/${slug}`;
  if (id) return `/news/${id}`;
  return "/news";
}

export default function Home() {
  const [news, setNews] = useState([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [newsErr, setNewsErr] = useState("");
  const [billing, setBilling] = useState("monthly");
  const planTitle = billing === "monthly" ? "Сарын багц" : "Жилийн багц";

  useEffect(() => {
    let alive = true;

    async function load() {
      setNewsLoading(true);
      setNewsErr("");

      try {
        const res = await fetch(`${API_BASE}/api/news?limit=6`, {
          headers: { Accept: "application/json" },
        });

        if (!res.ok) throw new Error(`Failed: ${res.status}`);

        const data = await res.json();

        const items = Array.isArray(data)
          ? data
          : Array.isArray(data?.items)
            ? data.items
            : Array.isArray(data?.news)
              ? data.news
              : Array.isArray(data?.data)
                ? data.data
                : [];

        if (alive) setNews(items);
      } catch (e) {
        if (alive) setNewsErr("Мэдээ ачааллахад алдаа гарлаа.");
      } finally {
        if (alive) setNewsLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    const items = document.querySelectorAll(".demoItem");

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("show");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.2,
      },
    );
    items.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const cards = document.querySelectorAll(".price-card");

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("show");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.3 },
    );

    cards.forEach((card) => observer.observe(card));

    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const section = document.querySelector(".publicDemo");
    if (!section) return;
    const getScrollParent = (el) => {
      let p = el.parentElement;
      while (p) {
        const s = getComputedStyle(p);
        const canScroll = /(auto|scroll)/.test(s.overflowY);
        if (canScroll && p.scrollHeight > p.clientHeight) return p;
        p = p.parentElement;
      }
      return window;
    };
    const scroller = getScrollParent(section);
    const getScrollTop = () =>
      scroller === window ? window.scrollY : scroller.scrollTop;
    const getViewportH = () =>
      scroller === window ? window.innerHeight : scroller.clientHeight;
    const sectionTopAbs = (() => {
      const r = section.getBoundingClientRect();
      if (scroller === window) return r.top + window.scrollY;

      const sr = scroller.getBoundingClientRect();
      return r.top - sr.top + scroller.scrollTop;
    })();

    let raf = 0;

    const update = () => {
      const items = Array.from(section.querySelectorAll(".demoItem"));
      const imgs = Array.from(section.querySelectorAll(".demoImg"));

      if (!items.length) return;

      const scrollInside = getScrollTop() - sectionTopAbs;
      const switchDistance = getViewportH() * 0.7;

      const idx = Math.max(
        0,
        Math.min(items.length - 1, Math.floor(scrollInside / switchDistance)),
      );

      items.forEach((el, i) => el.classList.toggle("isActive", i === idx));

      imgs.forEach((img, i) => {
        img.classList.toggle("active", i === idx);
      });
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    (scroller === window ? window : scroller).addEventListener(
      "scroll",
      onScroll,
      {
        passive: true,
      },
    );
    window.addEventListener("resize", update);
    update();
    return () => {
      (scroller === window ? window : scroller).removeEventListener(
        "scroll",
        onScroll,
      );
      window.removeEventListener("resize", update);
      cancelAnimationFrame(raf);
    };
  }, []);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 980px)");
    if (mq.matches) return;

    const section = document.querySelector(".publicDemo");
    if (!section) return;

    const getScrollParent = (el) => {
      let p = el.parentElement;
      while (p) {
        const s = getComputedStyle(p);
        const canScroll = /(auto|scroll)/.test(s.overflowY);
        if (canScroll && p.scrollHeight > p.clientHeight) return p;
        p = p.parentElement;
      }
      return window;
    };

    const scroller = getScrollParent(section);
    const getScrollTop = () =>
      scroller === window ? window.scrollY : scroller.scrollTop;
    const getViewportH = () =>
      scroller === window ? window.innerHeight : scroller.clientHeight;

    const sectionTopAbs = (() => {
      const r = section.getBoundingClientRect();
      if (scroller === window) return r.top + window.scrollY;
      const sr = scroller.getBoundingClientRect();
      return r.top - sr.top + scroller.scrollTop;
    })();

    let raf = 0;

    const update = () => {
      const items = Array.from(section.querySelectorAll(".demoItem"));
      const imgs = Array.from(section.querySelectorAll(".demoImg"));
      if (!items.length || !imgs.length) return;

      const scrollInside = getScrollTop() - sectionTopAbs;
      const switchDistance = getViewportH() * 0.7;
      const idx = Math.max(
        0,
        Math.min(items.length - 1, Math.floor(scrollInside / switchDistance)),
      );

      items.forEach((el, i) => el.classList.toggle("isActive", i === idx));
      imgs.forEach((img, i) => img.classList.toggle("active", i === idx));
    };

    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };

    (scroller === window ? window : scroller).addEventListener(
      "scroll",
      onScroll,
      { passive: true },
    );
    window.addEventListener("resize", update);
    update();

    return () => {
      (scroller === window ? window : scroller).removeEventListener(
        "scroll",
        onScroll,
      );
      window.removeEventListener("resize", update);
      cancelAnimationFrame(raf);
    };
  }, []);
  const newsCards = useMemo(
    () => (Array.isArray(news) ? news : []).slice(0, 3),
    [news],
  );
  return (
    <main className="publicHome">
      <section className="publicHero">
        <div className="publicHero__wrap">
          <div className="publicHero__copy">
            <h1 className="publicHero__title">
              <span className="text-accent">
                Хялбар үүсгэж <br />
                хурдан бүртгэ
              </span>
            </h1>
            <p className="publicHero__sub">
              Эвентээ хялбар үүсгэн, оролцогчидоо хурдан бүртгэ
            </p>
            <div className="publicHero__actions">
              <a className="btn btn--ghost" href="/login">
                Бүртгүүлэх
              </a>
              <a className="btn btn--ghost" href="#pricing">
                Багц харах
              </a>
            </div>
          </div>

          <div className="publicHero__visual" aria-hidden="true">
            <div className="heroShowcase">
              <div className="heroShowcase__track">
                <div className="heroShowcase__slide heroShowcase__slide--animate">
                  <img
                    src="/assets/home.png"
                    alt="Main preview 1"
                    className="heroShowcase__img heroShowcase__img--main"
                  />
                  <img
                    src="/assets/calendar.png"
                    alt="Left preview 2"
                    className="heroShowcase__img heroShowcase__img--left"
                  />
                  <img
                    src="/assets/home.png"
                    alt="Right preview 3"
                    className="heroShowcase__img heroShowcase__img--right"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="publicValue">
        <div className="publicContainer">
          <h2 className="publicSectionTitle">
            Олон нийтэд нээлттэй болон зөвхөн зорилтот хүмүүс рүү явуулах
            боломжтой арга хэмжээнүүд
          </h2>

          <div className="publicGrid3">
            <div className="publicIconCard">
              <div className="publicIcon">📈</div>
              <h3>Арга хэмжээгээ хялбар үүсгэ</h3>
              <p>
                Бизнес эрхлэгч эмэгтэйчүүдийн үндэсний сүлжээг бий болгож,
                тэдний хувь хүний болон мэргэжлийн өсөлтийг зөвлөн туслах,
                сүлжээний боломжоор хангах.
              </p>
            </div>

            <div className="publicIconCard">
              <div className="publicIcon">🎯</div>
              <h3>Оролцогчидоо бүртгэ</h3>
              <p>
                Тогтвортой, ёс зүйтэй бизнесийг бий болгоход бизнес эрхлэгч
                эмэгтэйчүүдийг чадавхжуулах.
              </p>
            </div>

            <div className="publicIconCard">
              <div className="publicIcon">🎯</div>
              <h3>Өөрийн зохион байгуулсан арга хэмжээг хяна</h3>
              <p>
                Тогтвортой, ёс зүйтэй бизнесийг бий болгоход бизнес эрхлэгч
                эмэгтэйчүүдийг чадавхжуулах.
              </p>
            </div>
          </div>
        </div>
      </section>
      <section className="publicDemo" id="demo">
        <div className="publicContainer">
          <div className="demoSticky">
            <h2 className="demoTitle demoTitle--sticky">
              Системийн хэрэглэгчидтэй онлайн хурал хийх боломж
            </h2>

            <div className="demoLayout">
              <div className="demoImageWrap">
                <div className="phoneFrame">
                  <div className="phoneTopBar" />

                  <div className="phoneScreen">
                    <img
                      src="/assets/switch/event.png"
                      alt="Preview 1"
                      className="demoImg active"
                    />
                    <img
                      src="/assets/switch/surgalt.png"
                      alt="Preview 2"
                      className="demoImg"
                    />
                    <img
                      src="/assets/switch/tosol.png"
                      alt="Preview 3"
                      className="demoImg"
                    />
                  </div>

                  <div className="phoneHome" />
                </div>
              </div>
              <div className="demoContent">
                <div className="demoItem">
                  <div className="demoItem__header">
                    <h3>Оролцсон арга хэмжээний хүмүүстэйгээ ярилцах боломж</h3>
                    <span>001</span>
                  </div>
                  <p>
                    Lorem Ipsum is simply dummy text of the printing and
                    typesetting
                  </p>
                </div>

                <div className="demoItem">
                  <div className="demoItem__header">
                    <h3>Өөрийн хувийн мэдээллээ хамгаалан уулзалт товлох</h3>
                    <span>002</span>
                  </div>
                  <p>
                    Lorem Ipsum is simply dummy text of the printing and
                    typesetting
                  </p>
                </div>

                <div className="demoItem">
                  <div className="demoItem__header">
                    <h3>Туршлагатай хүмүүстэй ярилцаж, туршлага судлах</h3>
                    <span>003</span>
                  </div>
                  <p>
                    Lorem Ipsum is simply dummy text of the printing and
                    typesetting
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="demoSpacer" aria-hidden="true" />
        </div>
      </section>
      <section className="publicNews" id="news">
        <div className="publicContainer">
          <div className="publicNews__head">
            <h2 className="publicSectionTitle">Сүүлийн үеийн мэдээ</h2>

            <a className="publicLink publicLink--inline" href="/news">
              Бүгдийг үзэх →
            </a>
          </div>

          {newsLoading ? (
            <div className="publicEmpty">Ачааллаж байна…</div>
          ) : newsErr ? (
            <div className="publicEmpty">{newsErr}</div>
          ) : newsCards.length === 0 ? (
            <div className="publicEmpty">Одоогоор мэдээ алга.</div>
          ) : (
            <div className="publicGrid3 publicGrid3--news">
              {newsCards.map((n) => {
                const preview = pickPreview(n);
                const img = toImgUrl(n.image_url || n.image || n.thumbnail);

                return (
                  <article className="newsCard" key={getNewsKey(n)}>
                    <a
                      className="newsCard__img"
                      href={getNewsHref(n)}
                      aria-label={safeText(n.title) || "News"}
                    >
                      {img ? (
                        <img src={img} alt={safeText(n.title) || "News"} />
                      ) : (
                        <div className="newsCard__ph" />
                      )}
                    </a>

                    <div className="newsCard__body">
                      <div className="newsCard__meta">
                        <span className="pill">
                          {safeText(n.category) || "Товч"}
                        </span>
                        <span className="dot">•</span>
                        <span className="date">
                          {fmtDate(n.created_at || n.createdAt || n.date)}
                        </span>
                      </div>

                      <h3 className="newsCard__title">
                        {safeText(n.title) || "Untitled"}
                      </h3>

                      <p className="newsCard__desc">
                        {preview
                          ? preview.slice(0, 160)
                          : "Товч тайлбар удахгүй нэмэгдэнэ."}
                      </p>

                      <div className="newsCard__actions">
                        <a className="newsReadBtn" href={getNewsHref(n)}>
                          Дэлгэрэнгүй <span aria-hidden>→</span>
                        </a>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
      <section className="prices" id="pricing">
        <div className="publicContainer">
          <h2 className="prices-title">Үнэ төлбөр</h2>
          <div className="billing-toggle">
            <div
              className={`toggle-pill ${billing === "yearly" ? "right" : ""}`}
            />

            <button
              className={billing === "monthly" ? "active" : ""}
              onClick={() => setBilling("monthly")}
            >
              Сар
            </button>

            <button
              className={billing === "yearly" ? "active" : ""}
              onClick={() => setBilling("yearly")}
            >
              Жил
            </button>
          </div>
          <div className="price-grid price-grid--two">
            <div className="price-card">
              <h3>{planTitle}</h3>
              <p
                className={
                  "price " + (billing === "yearly" ? "isYearly" : "isMonthly")
                }
              >
                {"Үнэгүй"}
              </p>
              <p className="price-desc">Энгийн Орон нутгийн </p>
              <ul>
                <li>
                  Хөдөө орон нутгаас онлайнаар сургалт арга хэмжээ, мэдээ
                  мэдээлэл авах гишүүд
                </li>
              </ul>
              <a className="btn btn--ghost" href="/signup">
                Багцаа авах
              </a>
            </div>
            <div className="price-card featured reveal">
              <div className="badge">Үндсэн</div>

              <h3>{planTitle}</h3>
              <p
                className={
                  "price " + (billing === "yearly" ? "isYearly" : "isMonthly")
                }
              >
                <AnimatedPrice
                  value={billing === "monthly" ? 125000 : 1500000}
                />
              </p>
              <p className="price-desc">Premium / Leadership </p>

              <ul>
                <li>Гүнзгийрүүлсэн менторшип</li>
                <li>Vip түвшний хамт олны арга хэмжээнд</li>
                <li>Танилцуулга болон харагдац (exposure) нэмэгдэх</li>
              </ul>

              <a className="btn btn--ghost" href="/billing">
                Багцаа авах
              </a>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
