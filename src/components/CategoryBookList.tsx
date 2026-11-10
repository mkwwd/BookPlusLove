'use client';

import { ArrowLeft } from 'lucide-react';

import BookManagementList from '@/components/BookManagementList';

interface Props {
  categoryCode: string;
  categoryLabel: string;
  backLabel: string;
  onBack: () => void;
}

export default function CategoryBookList({
  categoryCode,
  categoryLabel,
  backLabel,
  onBack,
}: Props) {
  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex min-h-11 items-center gap-2 text-base text-amber-800 hover:text-amber-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-900">
        <ArrowLeft aria-hidden="true" className="h-4 w-4 shrink-0" />
        {backLabel}
      </button>
      <h2 className="max-w-full min-w-0 font-serif text-3xl break-words text-amber-950">
        {categoryCode !== 'none' && `${categoryCode} `}
        {categoryLabel} 도서 목록
      </h2>
      <BookManagementList key={categoryCode} categoryCode={categoryCode} />
    </div>
  );
}
