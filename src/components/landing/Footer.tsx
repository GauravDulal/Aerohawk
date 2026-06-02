export default function Footer() {
  return (
    <footer>
      <div className="footer-grid">
        <div className="footer-brand">
          <h3>AERO<span>HAWK</span></h3>
          <p>
            Premium cleaning services for homes, offices, and commercial spaces
            across Australia. Clean. Reliable. Professional.
          </p>
        </div>
        <div className="footer-col">
          <h4>Services</h4>
          <ul>
            <li><a href="#services">Residential Cleaning</a></li>
            <li><a href="#services">Office Cleaning</a></li>
            <li><a href="#services">Deep Cleaning</a></li>
            <li><a href="#services">End of Lease</a></li>
            <li><a href="#services">Carpet Cleaning</a></li>
          </ul>
        </div>
        <div className="footer-col">
          <h4>Company</h4>
          <ul>
            <li><a href="#">About Us</a></li>
            <li><a href="#">Our Team</a></li>
            <li><a href="#">Careers</a></li>
            <li><a href="#testimonials">Reviews</a></li>
            <li><a href="#cta">Contact</a></li>
          </ul>
        </div>
        <div className="footer-col">
          <h4>Contact</h4>
          <ul>
            <li><a href="tel:+61400000000">📞 0400 000 000</a></li>
            <li><a href="mailto:hello@aerohawkcleaning.com.au">✉ hello@aerohawk.com.au</a></li>
            <li><a href="#">🇦🇺 Australia-Wide</a></li>
            <li><a href="#">Mon–Sat: 7am–7pm</a></li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        <p>© 2025 AeroHawk Cleaning Services. All rights reserved.</p>
        <div className="footer-badges">
          <div className="badge">
            <svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            Fully Insured
          </div>
          <div className="badge">
            <svg viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
            Police Checked
          </div>
        </div>
      </div>
    </footer>
  );
}
