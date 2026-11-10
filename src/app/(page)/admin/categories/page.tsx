import { Suspense } from 'react';

import CategoryCatalog from '@/components/CategoryCatalog';

export default function AdminCategoriesPage() {
  return (
    <Suspense fallback={<p className="py-8 text-center">불러오는 중...</p>}>
      <CategoryCatalog />
    </Suspense>
  );
}
