'use client';

import { ListTree, Plus, X } from 'lucide-react';
import Link from 'next/link';

import BookManagementList from '@/components/BookManagementList';

export default function AdminBookList({
  categoryCode = '',
}: { categoryCode?: string } = {}) {
  return (
    <BookManagementList
      categoryCode={categoryCode}
      renderHeader={({ activeTab, onTabChange, categories }) => (
        <>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="font-serif text-3xl text-amber-950">
              도서 목록 관리
            </h2>
            <div className="flex max-w-full flex-wrap items-center gap-2">
              <Link
                href="/admin/categories"
                className="flex items-center gap-1.5 rounded border border-amber-900/30 bg-white/40 px-4 py-2.5 text-base font-medium text-amber-950 transition hover:bg-amber-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-900">
                <ListTree aria-hidden="true" className="h-4 w-4 shrink-0" />
                분류코드 관리
              </Link>
              {activeTab === 'all' && (
                <Link
                  href="/admin/books/new"
                  className="flex items-center gap-1.5 rounded bg-red-900 px-4 py-2.5 text-base font-medium text-white transition hover:bg-red-800">
                  <Plus className="h-4 w-4" />
                  도서 등록
                </Link>
              )}
            </div>
          </div>
          {categoryCode && (
            <div className="flex flex-wrap items-center gap-3 border-y border-amber-900/15 py-3 text-lg text-amber-950">
              <ListTree aria-hidden="true" className="h-5 w-5 shrink-0" />
              <span>
                {categoryCode === 'none' ? (
                  '분류번호 없음'
                ) : (
                  <>
                    분류: {categoryCode}{' '}
                    {
                      categories.find(
                        (category) => category.code === categoryCode,
                      )?.label
                    }
                  </>
                )}
              </span>
              <Link
                href="/admin/books"
                title="분류 필터 해제"
                aria-label="분류 필터 해제"
                className="ml-auto inline-flex h-11 w-11 items-center justify-center rounded hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-900">
                <X aria-hidden="true" className="h-5 w-5" />
              </Link>
            </div>
          )}
          <div className="flex flex-wrap gap-2 border-b border-amber-900/20">
            <button
              type="button"
              onClick={() => onTabChange('all')}
              className={`border-b-2 px-4 py-3 text-base transition ${activeTab === 'all' ? 'border-red-900 text-red-900' : 'border-transparent text-amber-800 hover:text-amber-950'}`}>
              전체 도서
            </button>
            <button
              type="button"
              onClick={() => onTabChange('recommended')}
              className={`border-b-2 px-4 py-3 text-base transition ${activeTab === 'recommended' ? 'border-red-900 text-red-900' : 'border-transparent text-amber-800 hover:text-amber-950'}`}>
              추천 도서
            </button>
          </div>
        </>
      )}
    />
  );
}
