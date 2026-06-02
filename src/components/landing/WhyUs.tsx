import ScrollReveal from './ScrollReveal';

const features = [
  {
    title: 'Fully Insured & Police Checked',
    desc: 'Every team member is background-screened and our services are fully insured for your peace of mind.',
    icon: <svg viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
  },
  {
    title: 'Flexible Scheduling',
    desc: "We work around your life — early mornings, evenings, weekends. Book online in minutes, we'll handle the rest.",
    icon: <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  },
  {
    title: 'Satisfaction Guaranteed',
    desc: "Not happy? We'll come back and re-clean at no cost. Your satisfaction is our number one priority.",
    icon: <svg viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
  },
  {
    title: 'Eco-Friendly Products',
    desc: 'We use safe, environmentally responsible cleaning products — better for your family, pets, and the planet.',
    icon: <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
  },
];

export default function WhyUs() {
  return (
    <section id="why">
      <div className="hero-grid" />
      <div className="why-inner">
        <div>
          <ScrollReveal><div className="section-label">Why Choose Us</div></ScrollReveal>
          <ScrollReveal><h2 className="section-title">THE <em>AEROHAWK</em><br />DIFFERENCE</h2></ScrollReveal>
          <ScrollReveal>
            <p className="section-intro">
              We&apos;re not just cleaners — we&apos;re professionals who take pride in delivering
              a consistently outstanding result, every single time.
            </p>
          </ScrollReveal>
        </div>
        <div className="why-visual">
          <div className="why-big-letter">A</div>
          <div className="why-cards">
            {features.map((f, i) => (
              <ScrollReveal key={f.title} delay={i * 0.15}>
                <div className="why-card">
                  <div className="why-card-icon">{f.icon}</div>
                  <div>
                    <h4>{f.title}</h4>
                    <p>{f.desc}</p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
