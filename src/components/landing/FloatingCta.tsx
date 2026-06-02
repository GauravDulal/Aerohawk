'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function FloatingCta() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial check
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <Link href="/book" className={`float-btn ${visible ? 'visible' : ''}`}>
      Book Now →
    </Link>
  );
}
