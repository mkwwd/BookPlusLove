import { createRouteClient } from '@/utils/supabase/route';
import { supabaseServer } from '@/utils/supabase/server';

interface ParishRow {
  parishname: string;
}

interface UserRow {
  id: number;
  user_id: string;
  name: string;
  email: string;
  phone: string;
  birthdate: string | null;
  address: string | null;
  baptismal_name: string | null;
  created_at: string;
  role: string;
  parishes: ParishRow | ParishRow[] | null;
}

export async function GET() {
  const supabase = await createRouteClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return Response.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const { data: profile } = await supabaseServer
    .from('users')
    .select('role')
    .ilike('email', user.email)
    .maybeSingle();

  if (profile?.role !== 'ADMIN') {
    return Response.json(
      { error: '관리자만 조회할 수 있습니다.' },
      { status: 403 },
    );
  }

  const { data, error } = await supabaseServer
    .from('users')
    .select(
      'id, user_id, name, email, phone, birthdate, address, baptismal_name, created_at, role, parishes(parishname)',
    )
    .order('created_at', { ascending: false })
    .returns<UserRow[]>();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const members = (data ?? []).map((row) => {
    const parish = Array.isArray(row.parishes) ? row.parishes[0] : row.parishes;

    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      birthdate: row.birthdate,
      address: row.address,
      baptismalName: row.baptismal_name,
      parishName: parish?.parishname ?? null,
      joinedAt: row.created_at,
      role: row.role,
    };
  });

  return Response.json({ members });
}
