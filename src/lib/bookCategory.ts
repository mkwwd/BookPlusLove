export interface CategoryGroupRelation {
  book_category_groups: { label: string } | { label: string }[] | null;
}

export function categoryGroupLabel(category: CategoryGroupRelation): string {
  const group = category.book_category_groups;
  return (Array.isArray(group) ? group[0]?.label : group?.label) ?? '';
}
