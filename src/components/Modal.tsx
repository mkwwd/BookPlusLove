'use client';

import { X } from 'lucide-react';

export default function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-amber-900/20 bg-white shadow-lg">
        <div className="flex items-center justify-between border-b border-amber-900/10 px-6 py-4 sm:px-8">
          <h3 className="font-serif text-2xl text-amber-950">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="text-amber-800 hover:text-red-800">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto p-6 sm:p-8">{children}</div>
      </div>
    </div>
  );
}
