'use client';

import { useEffect, useRef, useState } from 'react';

import { X } from 'lucide-react';

// 책 표지 카드(BookShape)와 동일한 5:6 비율
const COVER_RATIO = 5 / 6;
const OUTPUT_WIDTH = 600;
const OUTPUT_HEIGHT = Math.round(OUTPUT_WIDTH / COVER_RATIO);
const MAX_ZOOM = 3;

interface Point {
  x: number;
  y: number;
}

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

  const [captured, setCaptured] = useState<{
    image: HTMLImageElement;
    src: string;
  } | null>(null);

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

    const src = canvas.toDataURL('image/jpeg', 0.95);
    const image = new Image();
    image.onload = () => setCaptured({ image, src });
    image.src = src;
  };

  if (captured) {
    return (
      <CropStage
        title={title}
        image={captured.image}
        src={captured.src}
        onRetake={() => setCaptured(null)}
        onCancel={onClose}
        onConfirm={onCapture}
      />
    );
  }

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
          <div className="mx-auto aspect-[5/6] max-h-[70vh] w-full max-w-xs overflow-hidden">
            <video
              ref={videoRef}
              className="h-full w-full object-cover"
              muted
              playsInline
            />
          </div>
          <div className="flex justify-center bg-black/80 py-3">
            <button
              type="button"
              onClick={handleCapture}
              className="rounded bg-red-900 px-5 py-2.5 text-base font-medium text-white transition hover:bg-red-800">
              촬영
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function CropStage({
  title,
  image,
  src,
  onRetake,
  onCancel,
  onConfirm,
}: {
  title: string;
  image: HTMLImageElement;
  src: string;
  onRetake: () => void;
  onCancel: () => void;
  onConfirm: (file: File) => void;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [viewportSize, setViewportSize] = useState({ width: 300, height: 360 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const dragState = useRef<{ start: Point; startPan: Point } | null>(null);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const bs = Math.max(
      rect.width / image.naturalWidth,
      rect.height / image.naturalHeight,
    );
    setViewportSize({ width: rect.width, height: rect.height });
    setPan({
      x: (rect.width - image.naturalWidth * bs) / 2,
      y: (rect.height - image.naturalHeight * bs) / 2,
    });
  }, [image]);

  const baseScale = Math.max(
    viewportSize.width / image.naturalWidth,
    viewportSize.height / image.naturalHeight,
  );
  const scale = baseScale * zoom;
  const displayWidth = image.naturalWidth * scale;
  const displayHeight = image.naturalHeight * scale;

  const clampPan = (next: Point, width: number, height: number): Point => ({
    x: Math.min(0, Math.max(viewportSize.width - width, next.x)),
    y: Math.min(0, Math.max(viewportSize.height - height, next.y)),
  });

  const handleZoomChange = (nextZoom: number) => {
    const nextScale = baseScale * nextZoom;
    const nextDisplayWidth = image.naturalWidth * nextScale;
    const nextDisplayHeight = image.naturalHeight * nextScale;
    setZoom(nextZoom);
    setPan(
      clampPan(
        {
          x: (viewportSize.width - nextDisplayWidth) / 2,
          y: (viewportSize.height - nextDisplayHeight) / 2,
        },
        nextDisplayWidth,
        nextDisplayHeight,
      ),
    );
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragState.current = {
      start: { x: e.clientX, y: e.clientY },
      startPan: pan,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragState.current) return;
    const { start, startPan } = dragState.current;
    const next = {
      x: startPan.x + (e.clientX - start.x),
      y: startPan.y + (e.clientY - start.y),
    };
    setPan(clampPan(next, displayWidth, displayHeight));
  };

  const handlePointerUp = () => {
    dragState.current = null;
  };

  const handleConfirm = () => {
    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_WIDTH;
    canvas.height = OUTPUT_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const sourceX = -pan.x / scale;
    const sourceY = -pan.y / scale;
    const sourceWidth = viewportSize.width / scale;
    const sourceHeight = viewportSize.height / scale;

    ctx.drawImage(
      image,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      OUTPUT_WIDTH,
      OUTPUT_HEIGHT,
    );

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        onConfirm(
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
        <span className="text-base text-white">{title} · 자르기</span>
        <button
          type="button"
          onClick={onCancel}
          aria-label="카메라 닫기"
          className="text-white hover:text-amber-200">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex flex-col items-center gap-3 bg-black/80 py-4">
        <div
          ref={viewportRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className="relative aspect-[5/6] max-h-[60vh] w-full max-w-xs touch-none overflow-hidden bg-black">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt="촬영한 표지 미리보기"
            draggable={false}
            className="absolute top-0 left-0 max-w-none select-none"
            style={{
              width: displayWidth,
              height: displayHeight,
              transform: `translate(${pan.x}px, ${pan.y}px)`,
            }}
          />
        </div>

        <input
          type="range"
          min={1}
          max={MAX_ZOOM}
          step={0.01}
          value={zoom}
          onChange={(e) => handleZoomChange(Number(e.target.value))}
          className="w-full max-w-xs"
          aria-label="확대/축소"
        />

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onRetake}
            className="rounded border border-white/30 px-5 py-2.5 text-base font-medium text-white transition hover:bg-white/10">
            다시 촬영
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="rounded bg-red-900 px-5 py-2.5 text-base font-medium text-white transition hover:bg-red-800">
            사용하기
          </button>
        </div>
      </div>
    </div>
  );
}
