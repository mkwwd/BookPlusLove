'use client';

import { useEffect, useRef, useState } from 'react';

import { X } from 'lucide-react';

export default function PhotoCapture({
  title = '사진 촬영',
  onCapture,
  onClose,
}: {
  title?: string;
  onCapture: (file: File) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('카메라를 시작할 수 없습니다. 카메라 권한을 확인해주세요.');
        }
      });

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        onCapture(
          new File([blob], `cover-${Date.now()}.jpg`, { type: 'image/jpeg' }),
        );
      },
      'image/jpeg',
      0.9,
    );
  };

  return (
    <div className="overflow-hidden rounded-lg border border-amber-900/20 bg-black shadow-sm">
      <div className="flex items-center justify-between bg-amber-900/90 px-4 py-2.5">
        <span className="text-base text-white">{title}</span>
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
        <>
          <video
            ref={videoRef}
            className="aspect-video w-full object-cover"
            muted
            playsInline
          />
          <div className="flex justify-center bg-black/80 py-3">
            <button
              type="button"
              onClick={handleCapture}
              className="rounded bg-gray-900 px-5 py-2.5 text-base font-medium text-white transition hover:bg-gray-800">
              촬영
            </button>
          </div>
        </>
      )}
    </div>
  );
}
