import { useEffect, useState } from "react";

import { Link } from "react-router-dom";

import {
  FaArrowRight,
  FaCalendarDays,
  FaUsers,
  FaChartLine,
  FaCreditCard,
  FaMagnifyingGlass,
  FaGift,
  FaCircleCheck,
  FaCheck,
  FaMobileScreenButton,
  FaTabletScreenButton,
  FaDesktop,
} from "react-icons/fa6";

import Footer from "../../components/Footer";
import AnimatedNumber from "./AnimatedNumber";
import HomeFaq from "./HomeFaq";
import HomeHero from "./HomeHero";
import HomeLifecycle from "./HomeLifecycle";
import HomeUpcoming from "./HomeUpcoming";

import { API_BASE } from "../../lib/config";

function normalizeArray(data) {
  if (Array.isArray(data)) return data;

  if (Array.isArray(data?.items)) return data.items;

  if (Array.isArray(data?.events)) return data.events;

  if (Array.isArray(data?.data)) return data.data;

  return [];
}

const features = [
  {
    icon: <FaCalendarDays />,

    title: "Ухаалаг хуваарь",

    text: "Эвэнт болон уулзалтын хуваарийг нэг дороос хурдан, ойлгомжтой удирдана.",
  },

  {
    icon: <FaUsers />,

    title: "Оролцогчдын удирдлага",

    text: "Бүртгэл, оролцогчдын мэдээлэл болон багтаамжийг бодит хугацаанд хянаарай.",
  },

  {
    icon: <FaChartLine />,

    title: "Бодит хугацааны мэдээлэл",

    text: "Эвэнтийн бүртгэл болон оролцооны мэдээллийг ойлгомжтойгоор хянах боломжтой.",
  },

  {
    icon: <FaCreditCard />,

    title: "Найдвартай систем",

    text: "Хэрэглэгчдэд энгийн, хурдан бөгөөд тогтвортой бүртгэлийн туршлага өгнө.",
  },
];

const testimonials = [
  {
    initials: "AW",

    name: "Ариунболд",

    role: "Engineering Manager",

    text: "Registra ашигласнаар манай эвэнтийн бүртгэл болон оролцогчдын удирдлага маш хурдан болсон.",
  },

  {
    initials: "SR",

    name: "Саруул",

    role: "Event Manager",

    text: "Хэрэглэхэд ойлгомжтой, эвэнтийн мэдээллийг нэг дороос удирдах боломж хамгийн их таалагдсан.",
  },

  {
    initials: "CL",

    name: "Цэлмэг",

    role: "Community Organizer",

    text: "Олон хүний бүртгэлийг гараар хөтлөх шаардлагагүй болсон нь бидний ажлыг маш их хөнгөвчилсөн.",
  },

  {
    initials: "DA",

    name: "Дөлгөөн",

    role: "Product Lead",

    text: "Бүртгэл, оролцогч болон эвэнтийн мэдээллийг нэг системээс харах нь маш тохиромжтой.",
  },

  {
    initials: "BK",

    name: "Билгүүн",

    role: "Security Engineer",

    text: "Жижиг workshop-оос том эвэнт хүртэл ашиглаж болох цэвэрхэн, хурдан платформ.",
  },

  {
    initials: "YP",

    name: "Ялгуун",

    role: "Platform Engineer",

    text: "Орчин үеийн дизайнтай бөгөөд desktop, tablet, mobile дээр бүгдэд нь маш эвтэйхэн.",
  },
];

const plans = [
  {
    title: "Free",

    price: "₮0",

    className: "free",

    features: [
      "50 хүртэл оролцогч",

      "Сард 2 эвэнт",

      "Үндсэн статистик",

      "И-мэйл дэмжлэг",

      "Стандарт бүртгэл",
    ],

    button: "Эхлэх",
  },

  {
    title: "Basic",

    price: "₮79,000",

    className: "basic",

    features: [
      "500 хүртэл оролцогч",

      "Сард 10 эвэнт",

      "Нарийвчилсан статистик",

      "Priority support",

      "Custom бүртгэл",
    ],

    button: "Үнэгүй турших",
  },

  {
    title: "Pro",

    price: "₮199,000",

    className: "pro",

    features: [
      "Хязгааргүй оролцогч",

      "Хязгааргүй эвэнт",

      "Бүрэн статистик",

      "Live support",

      "Custom branding",

      "API access",

      "Team collaboration",
    ],

    button: "Үнэгүй турших",
  },

  {
    title: "Enterprise",

    price: "Custom",

    className: "enterprise",

    features: [
      "Pro багцын бүх боломж",

      "Dedicated support",

      "Custom integrations",

      "Байгууллагын тохиргоо",

      "Priority SLA",
    ],

    button: "Холбогдох",
  },
];

export default function Home() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    let alive = true;

    async function loadEvents() {
      try {
        const res = await fetch(`${API_BASE}/api/events`);

        const data = await res.json().catch(() => []);

        if (alive && res.ok) {
          setEvents(normalizeArray(data));
        }
      } catch {
        if (alive) {
          setEvents([]);
        }
      }
    }

    loadEvents();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const elements = document.querySelectorAll("[data-ri-reveal]");

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          entry.target.classList.add("riVisible");

          observer.unobserve(entry.target);
        });
      },

      {
        threshold: 0.13,

        rootMargin: "0px 0px -45px 0px",
      },
    );

    elements.forEach((element) => observer.observe(element));

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <main className="riPublicPage">
      <HomeHero events={events} />

      <HomeUpcoming events={events} />

      <HomeLifecycle />

      <section className="riSection riFeaturesSection" id="features">
        <div className="riContainer">
          <div className="riSectionHead riRevealUp" data-ri-reveal>
            <div className="riPill">БОЛОМЖУУД</div>

            <h2>Амжилттай эвэнт зохион байгуулах бүх зүйл</h2>

            <p>
              Эвэнт зохион байгуулагчдад зориулсан хэрэгтэй боломжуудыг нэг
              дороос.
            </p>
          </div>

          <div className="riFeatureGrid">
            {features.map((item, index) => (
              <article
                className="riFeatureCard riRevealUp"
                data-ri-reveal
                key={item.title}
                style={{
                  "--ri-delay": `${index * 100}ms`,
                }}
              >
                <div className="riFeatureIcon">{item.icon}</div>

                <h3>{item.title}</h3>

                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="riSection riDevicesSection">
        <div className="riContainer riDevicesGrid">
          <div className="riDevicesContent riSlideFromLeft" data-ri-reveal>
            <div className="riPill riPurplePill">БҮХ ТӨХӨӨРӨМЖ</div>

            <h2>
              Бүх дэлгэц дээр
              <br />
              төгс харагдана
            </h2>

            <p>
              Гар утас, таблет эсвэл компьютер ашигласан ч Registra хэрэглэгч
              бүрт ижилхэн цэвэрхэн, хурдан туршлага өгнө.
            </p>

            <div className="riDeviceList">
              <div
                className="riDeviceItem"
                style={{ "--ri-device-delay": "0ms" }}
              >
                <span>
                  <FaMobileScreenButton />
                </span>

                <p>
                  <strong>Mobile</strong>

                  <small>Гар утсанд бүрэн нийцсэн</small>
                </p>
              </div>

              <div
                className="riDeviceItem"
                style={{ "--ri-device-delay": "110ms" }}
              >
                <span>
                  <FaTabletScreenButton />
                </span>

                <p>
                  <strong>Tablet</strong>

                  <small>Компакт, ойлгомжтой layout</small>
                </p>
              </div>

              <div
                className="riDeviceItem"
                style={{ "--ri-device-delay": "220ms" }}
              >
                <span>
                  <FaDesktop />
                </span>

                <p>
                  <strong>Desktop</strong>

                  <small>Бүрэн хэмжээний удирдлагын орчин</small>
                </p>
              </div>
            </div>
          </div>

          <div className="riDeviceVisual riSlideFromRight" data-ri-reveal>
            <div className="riBrowserMockup">
              <div className="riBrowserTop">
                <span />

                <span />

                <span />
              </div>

              <img
                src="https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1200&q=85"
                alt="Desktop"
              />
            </div>

            <div className="riLaptopMockup">
              <img
                src="https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=85"
                alt="Laptop"
              />
            </div>

            <div className="riPhoneMockup">
              <img
                src="https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=500&q=85"
                alt="Mobile"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="riSection riHowSection" id="how-it-works">
        <div className="riContainer">
          <div className="riSectionHead riRevealUp" data-ri-reveal>
            <div className="riPill riPurplePill">ХЭРХЭН АЖИЛЛАХ</div>

            <h2>Эвэнтээ хэдхэн алхмаар олоод бүртгүүл</h2>

            <p>Урт, төвөгтэй процесс байхгүй. Ердөө гурван алхам.</p>
          </div>

          <div className="riSteps riStepsSequence" data-ri-reveal>
            <div className="riStepConnector riStepConnectorOne">
              <span />
            </div>

            <div className="riStepConnector riStepConnectorTwo">
              <span />
            </div>

            <article className="riStep riAnimatedStep riAnimatedStepOne">
              <div className="riStepIcon">
                <FaMagnifyingGlass />

                <b>01</b>

                <i className="riStepPulse" />
              </div>

              <h3>Эвэнт олох</h3>

              <p>
                Сонирхсон хурал, workshop болон эвэнтээ хайж, дэлгэрэнгүй
                мэдээлэлтэй танилцаарай.
              </p>
            </article>

            <article className="riStep riAnimatedStep riAnimatedStepTwo">
              <div className="riStepIcon purple">
                <FaGift />

                <b>02</b>

                <i className="riStepPulse" />
              </div>

              <h3>Бүртгүүлэх</h3>

              <p>
                Хэдхэн секундэд бүртгүүлж, өөрийн оролцох эвэнтийг бүртгэлдээ
                хадгалаарай.
              </p>
            </article>

            <article className="riStep riAnimatedStep riAnimatedStepThree">
              <div className="riStepIcon violet">
                <FaCircleCheck />

                <b>03</b>

                <i className="riStepPulse" />
              </div>

              <h3>Оролцох</h3>

              <p>
                Эвэнтийн мэдээлэл, хуваарь болон шинэчлэлүүдээ өөрийн бүртгэлээс
                хянаарай.
              </p>
            </article>
          </div>

          <div className="riCenteredButton riRevealUp" data-ri-reveal>
            <Link to="/events" className="riPrimaryButton">
              Дараагийн эвэнтээ олох
              <FaArrowRight />
            </Link>
          </div>
        </div>
      </section>

      <section className="riSection riTestimonialsSection" id="testimonials">
        <div className="riContainer">
          <div className="riSectionHead riRevealUp" data-ri-reveal>
            <div className="riPill">СЭТГЭГДЭЛ</div>

            <h2>Хэрэглэгчдийн итгэсэн платформ</h2>

            <p>Registra ашиглаж байгаа хэрэглэгчдийн сэтгэгдлээс.</p>
          </div>

          <div className="riTestimonialSlider">
            <div className="riTestimonialTrack">
              {[...testimonials, ...testimonials].map((item, index) => (
                <article
                  className="riTestimonialCard"
                  key={`${item.name}-${index}`}
                >
                  <div className="riStars">★★★★★</div>

                  <p>“{item.text}”</p>

                  <div className="riTestimonialUser">
                    <span>{item.initials}</span>

                    <div>
                      <strong>{item.name}</strong>

                      <small>{item.role}</small>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="riBigStats riRevealUp" data-ri-reveal>
            <div>
              <strong>
                <AnimatedNumber value={5200} suffix="+" />
              </strong>

              <span>Бүртгэлтэй хэрэглэгч</span>
            </div>

            <div>
              <strong>
                <AnimatedNumber value={340} />
              </strong>

              <span>Зохион байгуулсан эвэнт</span>
            </div>

            <div>
              <strong>4.9 / 5</strong>

              <span>Дундаж үнэлгээ</span>
            </div>

            <div>
              <strong>
                <AnimatedNumber value={98} suffix="%" />
              </strong>

              <span>Санал болгоно</span>
            </div>
          </div>
        </div>
      </section>

      <section className="riSection riPricingSection" id="pricing">
        <div className="riContainer">
          <div className="riSectionHead riRevealUp" data-ri-reveal>
            <div className="riPill">БАГЦ</div>

            <h2>Энгийн, ойлгомжтой багц</h2>

            <p>Хэрэгцээндээ тохирсон багцаа сонгоорой.</p>
          </div>

          <div className="riPricingGrid">
            {plans.map((plan, index) => (
              <article
                className={`riPriceCard ${plan.className} riRevealUp`}
                data-ri-reveal
                key={plan.title}
                style={{
                  "--ri-delay": `${index * 90}ms`,
                }}
              >
                {plan.className === "pro" && (
                  <span className="riPopularBadge">ХАМГИЙН ЭРЭЛТТЭЙ</span>
                )}

                <h3>{plan.title}</h3>

                <div className="riPrice">
                  <strong>{plan.price}</strong>

                  {plan.price !== "Custom" && <span>/сар</span>}
                </div>

                <div className="riPlanFeatures">
                  {plan.features.map((feature) => (
                    <div key={feature}>
                      <FaCheck />

                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                <Link to="/login" className="riPlanButton">
                  {plan.button}
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <HomeFaq />

      <Footer />
    </main>
  );
}
