import { useEffect, useMemo, useState } from "react";

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
      ""
  );
}

function getNewsKey(n) {
  return n?.id ?? n?._id ?? n?.slug ?? n?.title ?? Math.random();
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

        // support: array OR {items:[...]} OR {news:[...]} OR {data:[...]}
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

  const newsCards = useMemo(
    () => (Array.isArray(news) ? news : []).slice(0, 3),
    [news]
  );

  return (
    <main className="publicHome">
      <section className="publicHero">
        <div className="publicHero__wrap">
          <div className="publicHero__copy">
            <h1 className="publicHero__title">
              <span className="text-accent">Хялбар</span> үүсгэж <br /> хурдан <span className="text-accent">бүртгэ</span>
            </h1>
            <p className="publicHero__sub">
              Энгийн хэлбэр үүсгэж, оролцогчоо хурдан бүртгэх — нэг линкээр.
            </p>
            <div className="publicHero__actions">
              <a className="btn btn--ghost" href="/login">
                Нэвтрэх
              </a>
              <a className="btn btn--ghost" href="#pricing">
                Багц харах
              </a>
            </div>
          </div>
          <div className="publicHero__visual" aria-hidden="true">
            <div className="heroSlider">
              <div className="heroSlider__track">
                <img src="/images/demo1.jpg" alt="Preview 1" />
                <img src="/images/demo2.jpg" alt="Preview 2" />
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="publicValue">
        <div className="publicContainer">
          <h2 className="publicSectionTitle">
            Олон нийтэд нээлттэй болон зөвхөн зорилтот хүмүүс рүү явуулах боломжтой арга хэмжээнүүд
          </h2>
          <div className="publicGrid3">
            <div className="publicIconCard">
              <div className="publicIcon">◎</div>
              <h3>Арга хэмжээгээ зөвлөн үүсгэ</h3>
              <p>Бүртгэлийн тохиргоо, оролцогчийн мэдээлэл, сануулгыг нэг дор.</p>
            </div>
            <div className="publicIconCard">
              <div className="publicIcon">◍</div>
              <h3>Оролцогчоо бүртгэ</h3>
              <p>Линкээ хуваалцаад, оролцогчийн мэдээллийг автоматаар цуглуул.</p>
            </div>
            <div className="publicIconCard">
              <div className="publicIcon">↗</div>
              <h3>Өөрийн зохион байгуулагч арга хэмжээгээ хяна</h3>
              <p>Ирц, бүртгэл, мэдэгдлийг нэг цонхноос хянаж удирд.</p>
            </div>
          </div>
        </div>
      </section>
      <section className="publicDemo">
        <div className="publicContainer">
          <h2 className="demoTitle">Системийн хэрэглэгчидтэй онлайн хурал хийх боломж</h2>
          <div className="demoLayout">
            <div className="demoImageWrap">
              <div className="demoImageStack">
                <img src="/images/demo1.jpg" alt="Preview 1" />
              </div>
            </div>
            <div className="demoContent">
              <div className="demoItem">
                <div className="demoItem__header">
                  <h3>Оролцсон арга хэмжээний хүмүүстэйгээ ярилцах боломж</h3>
                  <span>001</span>
                </div>
                <p>Ирцийн мэдээлэл дээр тулгуурлан шууд холбоо тогтооно.</p>
              </div>
              <div className="demoItem">
                <div className="demoItem__header">
                  <h3>Өөрийн хувийн мэдээллээ хамгаалан уулзалт товлох</h3>
                  <span>002</span>
                </div>
                <p>Имэйл, утсаа нийтэд дэлгэхгүйгээр уулзалт товлох боломж.</p>
              </div>
              <div className="demoItem">
                <div className="demoItem__header">
                  <h3>Туршлагатай хүмүүстэй ярилцаж, туршлага судлах</h3>
                  <span>003</span>
                </div>
                <p>Оролцогчдын сонирхол дээр суурилсан холболт.</p>
              </div>
              <a href="/features" className="demoButton">
                Explore features
              </a>
            </div>
          </div>
        </div>
      </section>
      <section className="publicNews" id="news">
        <div className="publicContainer">
          <div className="publicNews__head">
            <h2 className="publicSectionTitle">Сүүлийн үеийн мэдээ</h2>
          </div>
          {newsLoading ? (
            <div className="publicEmpty">Ачааллаж байна…</div>
          ) : newsErr ? (
            <div className="publicEmpty">{newsErr}</div>
          ) : newsCards.length === 0 ? (
            <div className="publicEmpty">Одоогоор мэдээ алга.</div>
          ) : (
            <>
              <div className="publicGrid3">
                {newsCards.map((n) => {
                  const preview = pickPreview(n);
                  return (
                    <article className="newsCard" key={getNewsKey(n)}>
                      <div className="newsCard__img">
                        {toImgUrl(n.image_url || n.image || n.thumbnail) ? (
                          <img
                            src={toImgUrl(n.image_url || n.image || n.thumbnail)}
                            alt={safeText(n.title) || "News"}
                          />
                        ) : (
                          <div className="newsCard__ph" />
                        )}
                      </div>
                      <div className="newsCard__body">
                        <div className="newsCard__meta">
                          <span>{safeText(n.category) || "Товч"}</span>
                          <span>·</span>
                          <span>{fmtDate(n.created_at || n.createdAt || n.date)}</span>
                        </div>
                        <h3 className="newsCard__title">{safeText(n.title) || "Untitled"}</h3>
                        <p className="newsCard__desc">
                          {(preview ? preview.slice(0, 160) : "Товч тайлбар удахгүй нэмэгдэнэ.")}
                        </p>
                        <div className="newsCard__actions">
                          <a className="newsReadBtn" href={getNewsHref(n)}>
                            Read →
                          </a>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
              <div className="publicNews__footer">
                <a className="publicLink publicLink--footer" href="/news">
                  Бүгдийг үзэх
                </a>
              </div>
            </>
          )}
        </div>
      </section>
      <section className="prices" id="pricing">
        <div className="publicContainer">
          <h2 className="prices-title">Үнэ төлбөр</h2>
          <div className="price-grid price-grid--two">
            <div className="price-card">
              <h3>Үнэгүй</h3>
              <p className="price">₮0</p>
              <p className="price-desc">Эхлэхэд хангалттай, үндсэн боломжууд</p>
              <ul>
                <li>Нийтийн арга хэмжээ үүсгэх</li>
                <li>Бүртгэл цуглуулах</li>
                <li>Суурь тайлан</li>
              </ul>
              <a className="btn btn--ghost" href="/signup">
                Үнэгүй эхлэх
              </a>
            </div>
            <div className="price-card featured">
              <h3>Сарын багц</h3>
              <p className="price">₮29,000</p>
              <p className="price-desc">Сар бүр — багц боломжууд</p>
              <ul>
                <li>Free багцын бүх зүйл</li>
                <li>Зорилтот урилга / хувийн арга хэмжээ</li>
              </ul>
              <a className="btn btn--ghost" href="/billing">
                Багцаа авах
              </a>
            </div>
          </div>
        </div>
      </section>
      <footer className="appFooter">
      <div className="appFooter__container">
        <div className="appFooter__grid">
          <div className="appFooter__brand">
            <h3 className="appFooter__logo">AppName</h3>
            <p>
              Building modern solutions for modern teams.
            </p>
          </div>
          <div className="appFooter__col">
            <h4>Product</h4>
            <ul>
              <li><a href="#">Features</a></li>
              <li><a href="#">Pricing</a></li>
              <li><a href="#">Security</a></li>
            </ul>
          </div>
          <div className="appFooter__col">
            <h4>Company</h4>
            <ul>
              <li><a href="#">About</a></li>
              <li><a href="#">Careers</a></li>
              <li><a href="#">Contact</a></li>
            </ul>
          </div>
          <div className="appFooter__col">
            <h4>Legal</h4>
            <ul>
              <li><a href="#">Privacy Policy</a></li>
              <li><a href="#">Terms of Service</a></li>
            </ul>
          </div>
        </div>
        <div className="appFooter__bottom">
          © 2026 AppName. All rights reserved.
        </div>
      </div>
    </footer>
    </main>
  );
}