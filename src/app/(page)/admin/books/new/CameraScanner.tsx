'use client';

import { useEffect, useRef, useState } from 'react';

import { BrowserMultiFormatReader } from '@zxing/browser';
import type { IScannerControls } from '@zxing/browser';
import { X } from 'lucide-react';

export default function CameraScanner({
  onDetected,
  onClose,
  validate,
  invalidMessage,
}: {
  onDetected: (text: string) => void;
  onClose: () => void;
  validate: (text: string) => boolean;
  invalidMessage: (code: string) => string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [rejectedCode, setRejectedCode] = useState<string | null>(null);

  useEffect(() => {
    if (!videoRef.current) return;

    let cancelled = false;
    let controls: IScannerControls | null = null;
    const reader = new BrowserMultiFormatReader();

    reader
      .decodeFromConstraints(
        { video: { facingMode: 'environment' } },
        videoRef.current,
        (result, _error, activeControls) => {
          controls = activeControls;
          if (!result || cancelled) return;

          const text = result.getText();
          // 원하는 형식이 아닌 바코드(부가기호/가격 바코드 등)는
          // 무시하고 계속 스캔한다.
          if (!validate(text)) {
            setRejectedCode(text);
            return;
          }

          cancelled = true;
          onDetected(text);
          activeControls.stop();
        },
      )
      .catch(() => {
        if (!cancelled) {
          setError('카메라를 시작할 수 없습니다. 카메라 권한을 확인해주세요.');
        }
      });

    return () => {
      cancelled = true;
      controls?.stop();
    };
  }, []);

  return (
    <div className="overflow-hidden rounded-lg border border-amber-900/20 bg-black shadow-sm">
      <div className="flex items-center justify-between bg-amber-900/90 px-4 py-2.5">
        <span className="text-base text-white">카메라로 바코드 스캔</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="카메라 닫기"
          className="text-white hover:text-amber-200">
          <X className="h-5 w-5" />
        </button>
      </div>

      {error ? (
        <p className="px-5 py-8 text-center text-base text-white">{error}</p>
      ) : (
        <div className="relative">
          <video
            ref={videoRef}
            className="aspect-video w-full object-cover"
            muted
            playsInline
          />
          {rejectedCode && (
            <p className="absolute right-0 bottom-0 left-0 bg-black/70 px-4 py-2 text-center text-sm text-white">
              {invalidMessage(rejectedCode)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
