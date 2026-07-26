'use client';

import { motion } from 'motion/react';

const paperTransition = {
  duration: 3.2,
  repeat: Infinity,
  repeatDelay: 0.8,
  times: [0, 0.18, 0.28, 0.42, 0.62, 0.82, 1],
  ease: 'easeInOut' as const,
};

export default function BookTearIllustration() {
  return (
    <svg
      viewBox="0 0 640 460"
      className="h-auto w-full max-w-[640px]"
      role="img"
      aria-label="책에서 종이 한 장이 찢어지는 애니메이션">
      {/* =========================
          1) 종이를 먼저 그림
          -> 나중에 책 페이지가 일부 덮어서
             종이가 책 안에 꽂힌 것처럼 보이게 함
         ========================= */}

      <motion.g
        animate={{
          x: [0, -2, 2, -1, 0, 0, 0],
          y: [0, 0, -2, -12, -38, -82, 0],
          rotate: [0, -1, 1, -2, -4, -7, 0],
          opacity: [1, 1, 1, 1, 1, 0, 0],
        }}
        transition={paperTransition}
        style={{
          transformBox: 'fill-box',
          transformOrigin: '50% 100%',
        }}>
        {/* 종이 본체 */}
        <path
          d="
            M250 88
            L420 102
            L436 280

            L420 268
            L406 280
            L392 269
            L378 281
            L364 269
            L350 282
            L336 270
            L322 282
            L308 270
            L294 281
            L280 269
            L266 279
            L252 267
            L238 278

            L226 140
            Z
          "
          fill="#ffffff"
          stroke="#4d4a48"
          strokeWidth="6"
          strokeLinejoin="round"
        />

        {/* 눈 */}
        <g fill="none" stroke="#4d4a48" strokeWidth="6" strokeLinecap="round">
          <path d="M285 155 308 178" />
          <path d="M308 155 285 178" />

          <path d="M372 161 395 184" />
          <path d="M395 161 372 184" />
        </g>

        {/* 입 */}
        <path
          d="M309 230C327 207 353 208 373 232"
          fill="none"
          stroke="#4d4a48"
          strokeWidth="6"
          strokeLinecap="round"
        />
      </motion.g>

      {/* 찢어질 때 남는 가운데 흔적 */}
      <motion.path
        d="
          M282 285
          L294 276
          L306 286
          L318 276
          L330 286
          L342 276
          L354 286
          L366 277
          L378 285
        "
        fill="none"
        stroke="#4d4a48"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        animate={{
          opacity: [0, 0, 0, 1, 1, 1, 0],
        }}
        transition={paperTransition}
      />

      {/* 효과선 */}
      <motion.g
        fill="none"
        stroke="#bcb8b2"
        strokeWidth="6"
        strokeLinecap="round"
        animate={{
          opacity: [0, 0, 1, 0.5, 0, 0, 0],
          scale: [0.85, 0.85, 1, 1.08, 1.08, 0.9, 0.9],
        }}
        transition={paperTransition}
        style={{
          transformBox: 'fill-box',
          transformOrigin: 'center',
        }}>
        <path d="M230 90 212 62" />
        <path d="M198 116 164 99" />
        <path d="M438 84 456 57" />
        <path d="M468 113 501 96" />
      </motion.g>

      {/* =========================
          2) 책을 나중에 그림
          -> 종이의 아래쪽이 페이지 뒤로 숨음
         ========================= */}

      {/* 책 뒤쪽 표지 */}
      <path
        d="
          M72 182
          L52 199
          L96 388
          C182 384 251 404 320 442
          C389 404 458 384 544 388
          L588 199
          L568 182
        "
        fill="#f1eeea"
        stroke="#4d4a48"
        strokeWidth="6"
        strokeLinejoin="round"
      />

      {/* 왼쪽 페이지 */}
      <path
        d="
          M320 400
          C249 351 175 331 86 335
          L51 171
          C147 146 238 165 320 224
          Z
        "
        fill="#ffffff"
        stroke="#4d4a48"
        strokeWidth="6"
        strokeLinejoin="round"
      />

      {/* 오른쪽 페이지 */}
      <path
        d="
          M320 400
          C391 351 465 331 554 335
          L589 171
          C493 146 402 165 320 224
          Z
        "
        fill="#ffffff"
        stroke="#4d4a48"
        strokeWidth="6"
        strokeLinejoin="round"
      />

      {/* 책 중심선 */}
      <path
        d="M320 224V400"
        fill="none"
        stroke="#4d4a48"
        strokeWidth="6"
        strokeLinecap="round"
      />

      {/* 왼쪽 페이지 선 */}
      <g fill="none" stroke="#4d4a48" strokeWidth="4" strokeLinecap="round">
        <path d="M110 240C181 238 244 258 292 290" />
        <path d="M118 276C180 279 239 297 289 328" />
      </g>

      {/* 오른쪽 페이지 선 */}
      <g fill="none" stroke="#4d4a48" strokeWidth="4" strokeLinecap="round">
        <path d="M530 240C459 238 396 258 348 290" />
        <path d="M522 276C460 279 401 297 351 328" />
      </g>

      {/* 아래쪽 곡선 */}
      <path
        d="M92 356C185 350 252 371 320 410C388 371 455 350 548 356"
        fill="none"
        stroke="#4d4a48"
        strokeWidth="6"
        strokeLinecap="round"
      />
    </svg>
  );
}
