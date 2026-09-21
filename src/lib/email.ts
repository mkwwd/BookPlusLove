// 회원가입 시 이메일을 입력하지 않은 회원용 가짜 이메일. Supabase Auth 계정은
// 항상 이메일이 있어야 해서 필요하지만, 실제로 메일을 받을 수 있는 주소가
// 아니므로 비밀번호 재설정 메일은 이 주소로 발송되면 안 된다.
const SYNTHETIC_EMAIL_DOMAIN = 'no-email.gcleibook.kr';

// 아이디를 16진수로 그대로 인코딩해서 로컬파트를 만든다 — 문자를 지워서
// 뭉개는 대신 인코딩하는 거라, 서로 다른 아이디는 항상 서로 다른 결과가
// 나온다 (아이디에 한글/특수문자가 들어있어도 충돌하지 않음).
export function buildSyntheticEmail(userId: string): string {
  const localPart = Buffer.from(userId, 'utf8').toString('hex');
  return `${localPart}@${SYNTHETIC_EMAIL_DOMAIN}`;
}

export function isSyntheticEmail(email: string): boolean {
  return email.toLowerCase().endsWith(`@${SYNTHETIC_EMAIL_DOMAIN}`);
}
