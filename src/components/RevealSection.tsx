'use client';

import { useEffect, useState, type ReactNode } from 'react';

export default function RevealSection({
  children,
  delayMs = 1700,
}: {
  children: ReactNode;
  delayMs?: number;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delayMs);
    return () => clearTimeout(t);
  }, [delayMs]);

  return (
    <div
      className="transition-all duration-700 ease-out"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(28px)',
      }}>
      {children}
    </div>
  );
}
