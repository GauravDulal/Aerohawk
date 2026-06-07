'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 60);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close menu on navigation
  const closeMenu = () => setMenuOpen(false);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  return (
    <>
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

        {/* Hamburger button */}
        <button
          className={`hamburger${menuOpen ? ' open' : ''}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
        >
          <span />
          <span />
          <span />
        </button>
      </nav>

      {/* Mobile menu overlay */}
      <div className={`mobile-menu-overlay${menuOpen ? ' open' : ''}`} onClick={closeMenu} />
      <div className={`mobile-menu${menuOpen ? ' open' : ''}`}>
        <a href="#hero" onClick={closeMenu}>Home</a>
        <a href="#services" onClick={closeMenu}>Services</a>
        <a href="#why" onClick={closeMenu}>Why Us</a>
        <a href="#process" onClick={closeMenu}>Process</a>
        <a href="#testimonials" onClick={closeMenu}>Reviews</a>
        <Link href="/book" className="mobile-menu-cta" onClick={closeMenu}>Book Online →</Link>
      </div>
    </>
  );
}
