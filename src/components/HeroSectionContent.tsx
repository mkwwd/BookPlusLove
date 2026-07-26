'use client';

import { useEffect, useState } from 'react';

import { Search } from 'lucide-react';

export default function HeroSectionContent({
  firstPart,
  secondPart,
  subText,
  placeholder,
  delayMs = 400,
  stepMs = 800,
}: {
  firstPart: string;
  secondPart: string;
  subText: string;
  placeholder: string;
  delayMs?: number;
  stepMs?: number;
}) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    // Stage 1: 메인 문구 2개 동시 등장
    const t1 = setTimeout(() => setStage(1), delayMs);
    // Stage 2: 설명 문구 + 검색창 동시 등장
    const t2 = setTimeout(() => setStage(2), delayMs + stepMs);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [delayMs, stepMs]);

  return (
    <div className="relative mx-auto max-w-5xl px-4 pt-50 pb-16 text-center">
      <p className="mb-5 font-serif text-3xl text-white [filter:drop-shadow(0_0_14px_rgba(253,230,138,0.9))_drop-shadow(0_2px_8px_rgba(0,0,0,0.6))] sm:text-6xl">
        <span
          className="inline-block transition-all duration-700 ease-out"
          style={{
            opacity: stage >= 1 ? 1 : 0,
            transform: stage >= 1 ? 'translateY(0)' : 'translateY(0.4em)',
          }}>
          <span className="mb-3 inline-block">{firstPart}</span>
          <br></br>
          <span className="inline-block">{secondPart}</span>
        </span>
      </p>

      <div
        className="transition-all duration-700 ease-out"
        style={{
          opacity: stage >= 2 ? 1 : 0,
          transform: stage >= 2 ? 'translateY(0)' : 'translateY(0.6em)',
        }}>
        <p className="mb-5 text-lg text-amber-50 [filter:drop-shadow(0_0_10px_rgba(253,230,138,0.85))_drop-shadow(0_1px_6px_rgba(0,0,0,0.6))] sm:text-[26px]">
          {subText}
        </p>

        <form
          action="/books"
          method="get"
          className="relative mx-auto max-w-lg">
          <Search className="absolute top-1/2 left-5 h-5 w-5 -translate-y-1/2 text-amber-900/50" />
          <input
            type="text"
            name="q"
            placeholder={placeholder}
            className="w-full rounded-full bg-white/95 py-4 pr-5 pl-12 text-base text-amber-950 shadow-lg placeholder:text-amber-900/40 focus:ring-2 focus:ring-amber-900/30 focus:outline-none"
          />
        </form>
      </div>
    </div>
  );
}
