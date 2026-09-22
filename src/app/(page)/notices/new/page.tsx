import { redirect } from 'next/navigation';

import NoticeEditor from '@/components/NoticeEditor';
import { requireAdmin } from '@/utils/supabase/admin';

export default async function NewNoticePage() {
  if ((await requireAdmin()).error) redirect('/notices');
  return <NoticeEditor />;
}
