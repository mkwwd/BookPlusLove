import 'server-only';

import { notFound } from 'next/navigation';

import { supabaseServer } from '@/utils/supabase/server';

export async function getNotice(id: string, isAdmin: boolean) {
  if (!/^[1-9]\d*$/.test(id)) notFound();
  let query = supabaseServer
    .from('notices')
    .select(
      'id, title, content, is_published, is_pinned, view_count, published_at',
    )
    .eq('id', id);
  if (!isAdmin) query = query.eq('is_published', true);
  const { data, error } = await query.maybeSingle();
  if (error) throw new Error('공지사항을 불러오지 못했습니다.');
  if (!data) notFound();
  return data;
}
