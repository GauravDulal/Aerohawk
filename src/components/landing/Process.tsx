import ScrollReveal from './ScrollReveal';

const steps = [
  { num: 1, name: 'Book Online', desc: 'Choose your service, select a time that suits you, and confirm your booking in under 2 minutes.' },
  { num: 2, name: 'We Confirm', desc: "Our team reviews your booking and sends a confirmation with your assigned cleaner's details." },
  { num: 3, name: 'We Clean', desc: 'Our professional team arrives on time, fully equipped, and gets to work delivering a spotless result.' },
  { num: 4, name: 'You Enjoy', desc: "Relax in your freshly cleaned space. If anything isn't perfect, we'll make it right — guaranteed." },
];

export default function Process() {
  return (
    <section id="process">
      <ScrollReveal>
        <div className="section-label">How It Works</div>
        <h2 className="section-title">SIMPLE <em>4-STEP</em> PROCESS</h2>
        <p className="section-intro" style={{ maxWidth: 500, margin: '0 auto' }}>
          Getting your space professionally cleaned couldn&apos;t be easier.
        </p>
      </ScrollReveal>
      <div className="process-steps">
        {steps.map((s, i) => (
          <ScrollReveal key={s.num} delay={i * 0.15}>
            <div className="process-step visible">
              <div className="step-circle">{s.num}</div>
              <div className="step-name">{s.name}</div>
              <p className="step-desc">{s.desc}</p>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}
