import ScrollReveal from './ScrollReveal';

const services = [
  {
    num: '01',
    name: 'Residential Cleaning',
    desc: 'Thorough, top-to-bottom home cleaning that keeps your living space spotless. Regular maintenance or one-off deep cleans available.',
    icon: <svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  },
  {
    num: '02',
    name: 'Office & Commercial',
    desc: 'Professional office cleaning to maintain a healthy, productive workspace. Flexible scheduling — after hours, weekends, or daily.',
    icon: <svg viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
  },
  {
    num: '03',
    name: 'Deep Cleaning',
    desc: 'An intensive clean covering every corner — behind appliances, inside cabinets, grout lines, and beyond. Perfect for move-ins and move-outs.',
    icon: <svg viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>,
  },
  {
    num: '04',
    name: 'End of Lease',
    desc: 'Bond-back guaranteed cleaning designed to meet real estate standards. We ensure your property is inspection-ready.',
    icon: <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>,
  },
  {
    num: '05',
    name: 'Carpet & Upholstery',
    desc: 'Steam and dry cleaning treatments for carpets, rugs, and furniture. Removes stains, odours, and allergens.',
    icon: <svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  },
  {
    num: '06',
    name: 'Window Cleaning',
    desc: 'Crystal-clear windows inside and out, using streak-free methods for both residential and high-rise commercial properties.',
    icon: <svg viewBox="0 0 24 24"><path d="M3 3h18v18H3z"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></svg>,
  },
];

export default function Services() {
  return (
    <section id="services">
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <ScrollReveal>
          <div className="section-label">What We Do</div>
          <h2 className="section-title">OUR <em>SERVICES</em></h2>
          <p className="section-intro">
            Tailored cleaning solutions for homes, offices, and commercial properties across Australia.
          </p>
        </ScrollReveal>
        <div className="services-grid">
          {services.map((s, i) => (
            <ScrollReveal key={s.num} delay={i * 0.08}>
              <div className="service-card">
                <div className="service-num">{s.num}</div>
                <div className="service-icon">{s.icon}</div>
                <div className="service-name">{s.name}</div>
                <p className="service-desc">{s.desc}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
