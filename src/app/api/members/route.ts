import { buildSyntheticEmail } from '@/lib/email';
import { EMAIL_REGEX, isValidPassword, PHONE_REGEX } from '@/lib/validation';
import { supabaseServer } from '@/utils/supabase/server';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const phone = typeof body?.phone === 'string' ? body.phone.trim() : '';
  // 이메일은 선택 입력이다 — 안 넣으면 비밀번호를 이메일로 재설정할 수
  // 없을 뿐, 회원가입 자체는 막지 않는다.
  const providedEmail =
    typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const userId = typeof body?.userId === 'string' ? body.userId : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  const birthdate = typeof body?.birthdate === 'string' ? body.birthdate : '';
  const address = typeof body?.address === 'string' ? body.address.trim() : '';
  const baptismalName =
    typeof body?.baptismalName === 'string' ? body.baptismalName.trim() : '';
  const parishId = typeof body?.parishId === 'number' ? body.parishId : null;

  if (!name) {
    return Response.json({ error: '이름을 입력해주세요.' }, { status: 400 });
  }
  if (!phone || !PHONE_REGEX.test(phone)) {
    return Response.json(
      { error: '핸드폰번호가 올바르지 않습니다.' },
      { status: 400 },
    );
  }
  if (providedEmail && !EMAIL_REGEX.test(providedEmail)) {
    return Response.json(
      { error: '이메일이 올바르지 않습니다.' },
      { status: 400 },
    );
  }
  if (!userId || userId.length < 4 || userId.length > 12) {
    return Response.json(
      { error: '아이디는 4~12자로 입력해주세요.' },
      { status: 400 },
    );
  }
  if (!password || !isValidPassword(password)) {
    return Response.json(
      { error: '비밀번호는 8자 이상, 특수문자를 포함해야 합니다.' },
      { status: 400 },
    );
  }
  const { data: existing } = await supabaseServer
    .from('users')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    return Response.json(
      { error: '이미 사용 중인 아이디입니다.' },
      { status: 409 },
    );
  }

  // Supabase Auth 계정은 이메일이 필수라서, 회원이 안 넣었으면 가짜
  // 이메일로 대신 채운다 (실제 메일이 오가지 않으니 재설정 메일은 못 받음).
  const email = providedEmail || buildSyntheticEmail(userId);

  const { data: authData, error: authError } =
    await supabaseServer.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

  if (authError) {
    const message = authError.message.includes('already been registered')
      ? '이미 사용 중인 이메일입니다.'
      : '회원가입에 실패했습니다.';
    return Response.json({ error: message }, { status: 409 });
  }

  const { data: inserted, error: insertError } = await supabaseServer
    .from('users')
    .insert({
      user_id: userId,
      email,
      name,
      phone,
      birthdate: birthdate || null,
      address: address || null,
      baptismal_name: baptismalName || null,
      parish_id: parishId,
    })
    .select('id, name')
    .single();

  if (insertError) {
    await supabaseServer.auth.admin.deleteUser(authData.user.id);
    return Response.json(
      { error: '회원가입에 실패했습니다.' },
      { status: 500 },
    );
  }

  return Response.json(
    { authId: authData.user.id, id: inserted.id, name: inserted.name },
    { status: 201 },
  );
}
