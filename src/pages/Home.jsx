export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="hero-content">
          <h1>
            Scheduling <span>that just works</span>
          </h1>
          <p>
            Create events, share links, and let people book time with you
            instantly — no emails, no confusion.
          </p>

          <div className="hero-actions">
            <button className="primary">Start for free</button>
            <button className="secondary">See demo</button>
          </div>
        </div>

        <div className="hero-visual">
          <div className="hero-card">
            <strong>Team Meeting</strong>
            <p>30 min · Google Meet</p>
          </div>

          <div className="hero-card">
            <strong>Client Call</strong>
            <p>45 min · Zoom</p>
          </div>
        </div>
      </section>

      <section className="features">
        <div className="feature">
          <h3>Smart Scheduling</h3>
          <p>Automatically avoid conflicts and double bookings.</p>
        </div>

        <div className="feature">
          <h3>Admin Control</h3>
          <p>Manage events, users, and permissions with ease.</p>
        </div>

        <div className="feature">
          <h3>Calendar Sync</h3>
          <p>Works with Google, Outlook, and more.</p>
        </div>
      </section>
      <section className="prices">
        <h2 className="prices-title">Simple, transparent pricing</h2>

        <div className="price-grid">
          <div className="price-card">
            <h3>Starter</h3>
            <p className="price">$0</p>
            <p className="price-desc">Perfect for trying things out</p>

            <ul>
              <li>✓ Basic features</li>
              <li>✓ Email support</li>
              <li>✓ 1 project</li>
            </ul>

            <button>Get Started</button>
          </div>

          <div className="price-card featured">
            <h3>Pro</h3>
            <p className="price">$29</p>
            <p className="price-desc">For growing teams</p>

            <ul>
              <li>✓ Everything in Starter</li>
              <li>✓ Unlimited projects</li>
              <li>✓ Priority support</li>
            </ul>

            <button>Choose Pro</button>
          </div>

          <div className="price-card">
            <h3>Enterprise</h3>
            <p className="price">Custom</p>
            <p className="price-desc">For large organizations</p>

            <ul>
              <li>✓ Custom integrations</li>
              <li>✓ Dedicated manager</li>
              <li>✓ SLA & security</li>
            </ul>

            <button>Contact Sales</button>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="footer-container">
          <div className="footer-brand">
            <h3>AppName</h3>
            <p>Building modern solutions for modern teams.</p>
          </div>

          <div className="footer-links">
            <h4>Product</h4>
            <a href="#">Features</a>
            <a href="#">Pricing</a>
            <a href="#">Security</a>
          </div>

          <div className="footer-links">
            <h4>Company</h4>
            <a href="#">About</a>
            <a href="#">Careers</a>
            <a href="#">Contact</a>
          </div>

          <div className="footer-links">
            <h4>Legal</h4>
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
          </div>
        </div>

        <div className="footer-bottom">
          © {new Date().getFullYear()} AppName. All rights reserved.
        </div>
      </footer>
    </>
  );
}
