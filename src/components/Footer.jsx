const Footer = () => {
  return (
    <footer className="appFooter">
      <div className="appFooter__container">
        <div className="appFooter__grid">
          <div className="appFooter__brand">
            <div className="appFooter__logo">Khural Plus+</div>
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
          © {new Date().getFullYear()} Khural Plus+. All rights reserved.
        </div>
      </div>
    </footer>
  );
};
export default Footer;