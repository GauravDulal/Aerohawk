'use client';

import { useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';

export default function Hero() {
  const statsRef = useRef<HTMLDivElement>(null);
  const animatedRef = useRef(false);

  const animateCount = useCallback((el: HTMLElement, target: number, suffix: string) => {
    let current = 0;
    const step = Math.ceil(target / 40);
    const timer = setInterval(() => {
      current = Math.min(current + step, target);
      el.textContent = current + suffix;
      if (current >= target) clearInterval(timer);
    }, 40);
  }, []);

  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !animatedRef.current) {
            animatedRef.current = true;
            const numEls = el.querySelectorAll<HTMLElement>('.stat-num');
            numEls.forEach((n) => {
              const text = n.textContent || '';
              const num = parseInt(text);
              const suffix = text.replace(String(num), '');
              animateCount(n, num, suffix);
            });
            observer.unobserve(el);
          }
        });
      },
      { threshold: 0.5 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [animateCount]);

  return (
    <section id="hero">
      <div className="hero-grid" />
      <div className="hero-glow" />
      <div className="hero-slash" />

      <div className="hero-content">
        <div className="hero-badge">🇦🇺 &nbsp; Australia-Wide Cleaning Professionals</div>

        {/* SVG logo mark */}
        <svg className="hero-logo-mark" viewBox="0 0 200 180" xmlns="http://www.w3.org/2000/svg" fill="none">
          <polygon points="100,10 145,130 125,130 100,60 75,130 55,130" fill="white" opacity="0.9" />
          <rect x="72" y="95" width="56" height="10" fill="white" opacity="0.9" />
          <path d="M30,80 Q10,60 5,40 Q25,50 45,65 Q65,75 80,90 Z" fill="#7a8ba8" opacity="0.85" />
          <path d="M35,90 Q15,75 8,55 Q28,65 50,78 Q68,87 82,100 Z" fill="#4a6080" opacity="0.7" />
          <path d="M130,80 Q150,72 165,78 Q170,88 158,95 Q148,100 135,98 Q125,94 130,80Z" fill="white" opacity="0.9" />
          <path d="M165,78 Q175,82 170,90 Q165,92 160,88Z" fill="white" opacity="0.9" />
          <circle cx="152" cy="84" r="3" fill="#1a2a5e" />
        </svg>

        <h1 className="hero-title">
          AERO<span>HAWK</span><br />CLEANING
        </h1>
        <p className="hero-sub">Clean &nbsp;·&nbsp; Reliable &nbsp;·&nbsp; Professional</p>
        <div className="hero-divider" />
        <p className="hero-desc">
          Premium commercial and residential cleaning solutions across Australia.
          We bring precision, care, and professionalism to every space we touch.
        </p>
        <div className="hero-btns">
          <Link href="/book" className="btn-primary">Get a Free Quote</Link>
          <a href="#services" className="btn-secondary">Our Services</a>
        </div>
      </div>

      <div className="hero-stats" ref={statsRef}>
        <div className="stat">
          <div className="stat-num">500+</div>
          <div className="stat-label">Happy Clients</div>
        </div>
        <div className="stat-sep" />
        <div className="stat">
          <div className="stat-num">5★</div>
          <div className="stat-label">Google Rating</div>
        </div>
        <div className="stat-sep" />
        <div className="stat">
          <div className="stat-num">3+</div>
          <div className="stat-label">Years Experience</div>
        </div>
      </div>

      <div className="scroll-cue">
        <span>Scroll</span>
        <div className="scroll-line" />
      </div>
    </section>
  );
}
