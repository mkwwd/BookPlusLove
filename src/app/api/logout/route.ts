import { createRouteClient } from '@/utils/supabase/route';

export async function POST() {
  const supabase = await createRouteClient();
  await supabase.auth.signOut();

  return Response.json({ ok: true });
}
