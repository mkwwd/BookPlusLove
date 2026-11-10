'use client';

import { usePathname, useSearchParams } from 'next/navigation';

import CatalogManager from '@/components/CatalogManager';

export default function CategoryCatalog() {
  const pathname = usePathname();
  const params = useSearchParams();
  const group = params.get('group') ?? '';
  const category = params.get('category') ?? '';
  const groupCode = category !== 'none' && /^\d{3}$/.test(group) ? group : '';
  const categoryCode =
    category === 'none' || (groupCode && /^\d{3}$/.test(category))
      ? category
      : '';

  const urlFor = (group = '', category = '') => {
    const next = new URLSearchParams();
    if (group) next.set('group', group);
    if (category) next.set('category', category);
    return `${pathname}${next.size ? `?${next}` : ''}`;
  };

  return (
    <CatalogManager
      kind="category-groups"
      navigation={{
        groupCode,
        categoryCode,
        open: (group, category = '') => {
          const url = urlFor(group, category);
          const current = window.location.pathname + window.location.search;
          if (url !== current)
            window.history.pushState({ catalogParent: current }, '', url);
        },
        back: (group = '') => {
          const parent = urlFor(group);
          // Deep links may have no catalog parent in history.
          if (window.history.state?.catalogParent === parent)
            window.history.back();
          else window.history.replaceState(null, '', parent);
        },
      }}
    />
  );
}
