import { supabaseServer } from '@/utils/supabase/server';

const PHONE_REGEX = /^01[0-9]-?\d{3,4}-?\d{4}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SPECIAL_CHAR_REGEX = /[^a-zA-Z0-9]/;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const phone = typeof body?.phone === 'string' ? body.phone.trim() : '';
  const email = typeof body?.email === 'string' ? body.email.trim() : '';
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
  if (!email || !EMAIL_REGEX.test(email)) {
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
  if (!password || password.length < 8 || !SPECIAL_CHAR_REGEX.test(password)) {
    return Response.json(
      { error: '비밀번호는 8자 이상, 특수문자를 포함해야 합니다.' },
      { status: 400 },
    );
  }
  if (!birthdate) {
    return Response.json(
      { error: '생년월일을 입력해주세요.' },
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
      birthdate,
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
