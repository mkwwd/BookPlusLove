'use client';

import { useEffect, useRef } from 'react';

// Matches the vertical scrollbar width in globals.css.
const SCROLLBAR_WIDTH = 36;

export function useHorizontalWheel() {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    const handleWheel = (event: WheelEvent) => {
      if (element.scrollWidth <= element.clientWidth) return;
      const rect = element.getBoundingClientRect();
      if (event.clientX >= rect.right - SCROLLBAR_WIDTH) return;
      if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
        element.scrollLeft += event.deltaY;
        event.preventDefault();
      }
    };

    // A non-passive listener is required to prevent page scrolling.
    element.addEventListener('wheel', handleWheel, { passive: false });
    return () => element.removeEventListener('wheel', handleWheel);
  }, []);

  return scrollRef;
}
