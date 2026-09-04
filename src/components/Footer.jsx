import { Link } from "react-router-dom";
import {
  FaFacebookF,
  FaLinkedinIn,
  FaGithub,
  FaInstagram,
} from "react-icons/fa6";

export default function Footer() {
  return (
    <footer className="riFooter">
      <div className="riContainer">
        <div className="riFooterGrid">
          <div className="riFooterBrand">
            <Link to="/" className="riBrand">
              <span className="riBrandIcon">★</span>
              <span className="riBrandText">
                <strong>Khural Plus</strong>
                <small>REGISTRA</small>
              </span>
            </Link>

            <p>
              Орчин үеийн эвэнт, хурал, уулзалтын бүртгэл болон удирдлагын
              нэгдсэн платформ.
            </p>

            <div className="riFooterSocials">
              <a href="#" aria-label="Facebook">
                <FaFacebookF />
              </a>
              <a href="#" aria-label="LinkedIn">
                <FaLinkedinIn />
              </a>
              <a href="#" aria-label="Github">
                <FaGithub />
              </a>
              <a href="#" aria-label="Instagram">
                <FaInstagram />
              </a>
            </div>
          </div>

          <div className="riFooterColumn">
            <h4>ХОЛБООС</h4>
            <Link to="/">Нүүр</Link>
            <Link to="/events">Эвэнт</Link>
            <Link to="/news">Мэдээ</Link>
          </div>

          <div className="riFooterColumn">
            <h4>ҮЙЛЧИЛГЭЭ</h4>
            <a href="#features">Боломжууд</a>
            <a href="#how-it-works">Хэрхэн ажиллах</a>
            <a href="#pricing">Багц</a>
            <a href="#testimonials">Сэтгэгдэл</a>
          </div>

          <div className="riFooterColumn">
            <h4>ХОЛБОО БАРИХ</h4>
            <span>hello@khuralplus.mn</span>
            <span>+976 7000 0000</span>
            <span>Улаанбаатар, Монгол</span>
          </div>
        </div>

        <div className="riFooterBottom">
          <span>© {new Date().getFullYear()} Khural Plus. All rights reserved.</span>

          <div>
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}