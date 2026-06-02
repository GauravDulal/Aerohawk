'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 60);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`landing-nav${scrolled ? ' scrolled' : ''}`}>
      <a href="#hero" className="nav-logo" style={{ textDecoration: 'none' }}>
        AERO<span>HAWK</span>
      </a>
      <ul className="nav-links">
        <li><a href="#hero">Home</a></li>
        <li><a href="#services">Services</a></li>
        <li><a href="#why">Why Us</a></li>
        <li><a href="#process">Process</a></li>
        <li><a href="#testimonials">Reviews</a></li>
        <li><Link href="/book" className="nav-cta">Book Online</Link></li>
      </ul>
    </nav>
  );
}
