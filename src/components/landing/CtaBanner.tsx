import Link from 'next/link';
import ScrollReveal from './ScrollReveal';

export default function CtaBanner() {
  return (
    <section id="cta">
      <div className="hero-grid" />
      <ScrollReveal>
        <div className="cta-inner">
          <div className="section-label">Ready to Get Started?</div>
          <h2 className="section-title">BOOK YOUR<br />CLEAN TODAY</h2>
          <p>
            No lock-in contracts. Transparent pricing. Guaranteed results.<br />
            Serving Sydney, Melbourne, Brisbane, Perth, Adelaide &amp; beyond.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' as const }}>
            <Link href="/book" className="btn-primary">📅 &nbsp; Book Online</Link>
            <a href="mailto:hello@aerohawkcleaning.com.au" className="btn-secondary">✉ &nbsp; Email Us</a>
          </div>
          <p style={{ marginTop: '2rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '2px' }}>
            FOLLOW US ON FACEBOOK &nbsp;·&nbsp; @AEROHAWKCLEANING
          </p>
        </div>
      </ScrollReveal>
    </section>
  );
}
