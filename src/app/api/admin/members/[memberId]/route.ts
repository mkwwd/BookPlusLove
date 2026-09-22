import { buildSyntheticEmail } from '@/lib/email';
import { EMAIL_REGEX, isValidPassword, PHONE_REGEX } from '@/lib/validation';
import { requireAdmin } from '@/utils/supabase/admin';
import { supabaseServer } from '@/utils/supabase/server';

const VALID_ROLES = ['USER', 'ADMIN'];
const MAX_ADMIN_COUNT = 5;

interface MemberRow {
  id: number;
  user_id: string;
  email: string;
  name: string;
  phone: string;
  birthdate: string | null;
  address: string | null;
  baptismal_name: string | null;
  parish_id: number | null;
  role: string;
}

// Supabase Auth 쪽엔 public.users.id를 직접 가리키는 컬럼이 없어서,
// 이메일로 매칭되는 auth 계정을 찾아야 한다. 이 앱 규모(회원 수십~수백
// 명)에선 listUsers 한 번으로 충분하다.
async function findAuthUserByEmail(email: string) {
  const { data } = await supabaseServer.auth.admin.listUsers();
  return (
    data?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase()) ??
    null
  );
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ memberId: string }> },
) {
  const { error: authError } = await requireAdmin();
  if (authError) return authError;

  const { memberId } = await params;
  const memberIdNum = Number(memberId);
  if (!Number.isInteger(memberIdNum) || memberIdNum < 0) {
    return Response.json({ error: '잘못된 요청입니다.' }, { status: 400 });
  }

  const { data: existing, error: fetchError } = await supabaseServer
    .from('users')
    .select(
      'id, user_id, email, name, phone, birthdate, address, baptismal_name, parish_id, role',
    )
    .eq('id', memberIdNum)
    .maybeSingle<MemberRow>();

  if (fetchError) {
    return Response.json({ error: fetchError.message }, { status: 500 });
  }
  if (!existing) {
    return Response.json(
      { error: '해당 회원을 찾을 수 없습니다.' },
      { status: 404 },
    );
  }

  const body = await request.json().catch(() => null);
  const updates: Record<string, unknown> = {};

  if (typeof body?.role === 'string') {
    if (!VALID_ROLES.includes(body.role)) {
      return Response.json(
        { error: '권한 값이 올바르지 않습니다.' },
        { status: 400 },
      );
    }
    if (body.role === 'ADMIN' && existing.role !== 'ADMIN') {
      const { count } = await supabaseServer
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'ADMIN');
      if ((count ?? 0) >= MAX_ADMIN_COUNT) {
        return Response.json(
          {
            error: `관리자는 최대 ${MAX_ADMIN_COUNT}명까지만 지정할 수 있습니다.`,
          },
          { status: 400 },
        );
      }
    }
    updates.role = body.role;
  }

  if (typeof body?.name === 'string') {
    const name = body.name.trim();
    if (!name) {
      return Response.json({ error: '이름을 입력해주세요.' }, { status: 400 });
    }
    updates.name = name;
  }

  if (typeof body?.phone === 'string') {
    const phone = body.phone.trim();
    if (!PHONE_REGEX.test(phone)) {
      return Response.json(
        { error: '핸드폰번호가 올바르지 않습니다.' },
        { status: 400 },
      );
    }
    updates.phone = phone;
  }

  if (typeof body?.birthdate === 'string') {
    updates.birthdate = body.birthdate || null;
  }

  if (typeof body?.baptismalName === 'string') {
    updates.baptismal_name = body.baptismalName.trim() || null;
  }

  if (typeof body?.address === 'string') {
    updates.address = body.address.trim() || null;
  }

  if ('parishId' in (body ?? {})) {
    updates.parish_id =
      typeof body.parishId === 'number' ? body.parishId : null;
  }

  let nextEmail = existing.email;
  if (typeof body?.email === 'string') {
    const trimmed = body.email.trim().toLowerCase();
    nextEmail = trimmed || buildSyntheticEmail(existing.user_id);
    if (trimmed && !EMAIL_REGEX.test(trimmed)) {
      return Response.json(
        { error: '이메일이 올바르지 않습니다.' },
        { status: 400 },
      );
    }
    if (nextEmail !== existing.email) {
      updates.email = nextEmail;
    }
  }

  let newPassword: string | undefined;
  if (typeof body?.password === 'string' && body.password) {
    if (!isValidPassword(body.password)) {
      return Response.json(
        { error: '비밀번호는 8자 이상, 특수문자를 포함해야 합니다.' },
        { status: 400 },
      );
    }
    newPassword = body.password;
  }

  // 이메일이 바뀌거나 비밀번호를 초기화하면, 로그인에 쓰는 Supabase
  // Auth 계정도 같이 바꿔야 한다 — 안 그러면 로그인 시 어긋나서 실패한다.
  if (updates.email || newPassword) {
    const authUser = await findAuthUserByEmail(existing.email);
    if (!authUser) {
      return Response.json(
        { error: '연결된 로그인 계정을 찾을 수 없습니다.' },
        { status: 500 },
      );
    }

    const { error: authUpdateError } =
      await supabaseServer.auth.admin.updateUserById(authUser.id, {
        ...(updates.email ? { email: nextEmail } : {}),
        ...(newPassword ? { password: newPassword } : {}),
      });
    if (authUpdateError) {
      const message = authUpdateError.message.includes(
        'already been registered',
      )
        ? '이미 사용 중인 이메일입니다.'
        : '계정 정보 변경에 실패했습니다.';
      return Response.json({ error: message }, { status: 409 });
    }
  }

  if (Object.keys(updates).length === 0) {
    return Response.json({ ok: true });
  }

  const { error: updateError } = await supabaseServer
    .from('users')
    .update(updates)
    .eq('id', memberIdNum);

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ memberId: string }> },
) {
  const { email: adminEmail, error: authError } = await requireAdmin();
  if (authError) return authError;

  const { memberId } = await params;
  const memberIdNum = Number(memberId);
  if (!Number.isInteger(memberIdNum) || memberIdNum < 0) {
    return Response.json({ error: '잘못된 요청입니다.' }, { status: 400 });
  }

  const { data: existing, error: fetchError } = await supabaseServer
    .from('users')
    .select('id, email')
    .eq('id', memberIdNum)
    .maybeSingle<Pick<MemberRow, 'id' | 'email'>>();

  if (fetchError) {
    return Response.json({ error: fetchError.message }, { status: 500 });
  }
  if (!existing) {
    return Response.json(
      { error: '해당 회원을 찾을 수 없습니다.' },
      { status: 404 },
    );
  }

  if (adminEmail && existing.email.toLowerCase() === adminEmail.toLowerCase()) {
    return Response.json(
      { error: '본인 계정은 삭제할 수 없습니다.' },
      { status: 400 },
    );
  }

  const { error: deleteError } = await supabaseServer
    .from('users')
    .delete()
    .eq('id', memberIdNum);

  if (deleteError) {
    const message =
      deleteError.code === '23503'
        ? '대출/기증 기록이 있는 회원은 삭제할 수 없습니다.'
        : deleteError.message;
    return Response.json({ error: message }, { status: 409 });
  }

  const authUser = await findAuthUserByEmail(existing.email);
  if (authUser) {
    await supabaseServer.auth.admin.deleteUser(authUser.id);
  }

  return Response.json({ ok: true });
}
