import ScrollReveal from './ScrollReveal';

const testimonials = [
  {
    text: 'Absolutely incredible service. The team was on time, thorough, and my apartment has never looked this clean. Will definitely be booking again every fortnight.',
    initials: 'SL',
    name: 'Sarah L.',
    loc: 'Sydney, NSW',
  },
  {
    text: 'Used AeroHawk for an end-of-lease clean and got my full bond back. The real estate agent was genuinely impressed. Highly recommended!',
    initials: 'JM',
    name: 'James M.',
    loc: 'Melbourne, VIC',
  },
  {
    text: 'We use AeroHawk for our office weekly. Consistently professional, always reliable, and the team is incredibly friendly. Our workplace is always spotless.',
    initials: 'RT',
    name: 'Rachel T.',
    loc: 'Brisbane, QLD',
  },
];

export default function Testimonials() {
  return (
    <section id="testimonials">
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <ScrollReveal>
          <div style={{ textAlign: 'center' }}>
            <div className="section-label">Client Reviews</div>
            <h2 className="section-title">WHAT CLIENTS <em>SAY</em></h2>
          </div>
        </ScrollReveal>
        <div className="testi-grid">
          {testimonials.map((t, i) => (
            <ScrollReveal key={t.name} delay={i * 0.15}>
              <div className="testi-card">
                <div className="testi-quote">&ldquo;</div>
                <p className="testi-text">{t.text}</p>
                <div className="testi-stars">★★★★★</div>
                <div className="testi-author">
                  <div className="testi-avatar">{t.initials}</div>
                  <div>
                    <div className="testi-name">{t.name}</div>
                    <div className="testi-loc">{t.loc}</div>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
