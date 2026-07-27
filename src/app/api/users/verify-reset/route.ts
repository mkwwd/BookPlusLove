import { Resend } from 'resend';

import { supabaseServer } from '@/utils/supabase/server';

const resend = new Resend(process.env.RESEND_API_KEY);

// TODO: 도메인(bookpluslove.com)이 Resend에서 인증되면 아래 발신 주소를
// 'noreply@bookpluslove.com'으로 바꾼다.
const FROM_ADDRESS = '책더하기사랑도서관 <onboarding@resend.dev>';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const userId = typeof body?.userId === 'string' ? body.userId.trim() : '';
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const email = typeof body?.email === 'string' ? body.email.trim() : '';

  if (!userId || !name || !email) {
    return Response.json(
      { error: '아이디, 이름, 이메일을 모두 입력해주세요.' },
      { status: 400 },
    );
  }

  const { data, error } = await supabaseServer
    .from('users')
    .select('id')
    .eq('user_id', userId)
    .eq('name', name)
    .eq('email', email)
    .maybeSingle();

  if (error || !data) {
    return Response.json(
      { error: '일치하는 회원 정보가 없습니다.' },
      { status: 404 },
    );
  }

  const redirectTo = `${new URL(request.url).origin}/reset-password`;

  const { data: linkData, error: linkError } =
    await supabaseServer.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo },
    });

  if (linkError || !linkData) {
    return Response.json(
      { error: '재설정 링크 생성에 실패했습니다.' },
      { status: 500 },
    );
  }

  const { error: sendError } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: email,
    subject: '[책더하기사랑도서관] 비밀번호 재설정 안내',
    html: `
      <div style="font-family:sans-serif; line-height:1.6; color:#3a2a1a;">
        <p>안녕하세요, ${name}님.</p>
        <p>아래 버튼을 눌러 비밀번호를 재설정해주세요. 이 링크는 본인이 요청하지 않았다면 무시하셔도 됩니다.</p>
        <p style="margin:24px 0;">
          <a href="${linkData.properties.action_link}"
             style="background:#7f1d1d; color:#fff; padding:12px 24px; border-radius:4px; text-decoration:none;">
            비밀번호 재설정하기
          </a>
        </p>
        <p style="font-size:13px; color:#8a7a5a;">책더하기사랑도서관 · 광주가톨릭평생교육원</p>
      </div>
    `,
  });

  if (sendError) {
    return Response.json(
      { error: '재설정 메일 발송에 실패했습니다.' },
      { status: 500 },
    );
  }

  return Response.json({ verified: true });
}
