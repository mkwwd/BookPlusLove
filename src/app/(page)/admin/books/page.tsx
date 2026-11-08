import AdminBookList from '@/components/AdminBookList';

export default async function AdminBooksPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string | string[] }>;
}) {
  const { category } = await searchParams;
  const categoryCode =
    (Array.isArray(category) ? category[0] : category)?.trim() ?? '';

  return <AdminBookList key={categoryCode} categoryCode={categoryCode} />;
}
