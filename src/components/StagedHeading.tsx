'use client';

import { useEffect, useState } from 'react';

export default function StagedHeading({
  firstPart,
  secondPart,
  className,
  delayMs = 300,
  stepMs = 600,
}: {
  firstPart: string;
  secondPart: string;
  className?: string;
  delayMs?: number;
  stepMs?: number;
}) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setStage(1), delayMs);
    const t2 = setTimeout(() => setStage(2), delayMs + stepMs);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [delayMs, stepMs]);

  return (
    <p className={className}>
      <span
        className="inline-block transition-all duration-700 ease-out"
        style={{
          opacity: stage >= 1 ? 1 : 0,
          transform: stage >= 1 ? 'translateY(0)' : 'translateY(0.4em)',
        }}>
        {firstPart}
      </span>
      <span
        className="inline-block transition-all duration-700 ease-out"
        style={{
          opacity: stage >= 2 ? 1 : 0,
          transform: stage >= 2 ? 'translateY(0)' : 'translateY(0.4em)',
        }}>
        {secondPart}
      </span>
    </p>
  );
}
