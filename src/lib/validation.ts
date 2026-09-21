export const PHONE_REGEX = /^01[0-9]-?\d{4}-?\d{4}$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SPECIAL_CHAR_REGEX = /[^a-zA-Z0-9]/;

export function isValidPassword(password: string): boolean {
  return password.length >= 8 && SPECIAL_CHAR_REGEX.test(password);
}

const RANDOM_PASSWORD_CHARS =
  'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';

// 관리자가 회원 비밀번호를 강제로 초기화할 때, 직접 생각하지 않고도
// 바로 쓸 수 있는 임시 비밀번호를 만들어준다. 특수문자가 안 뽑히는
// 드문 경우를 대비해 유효할 때까지 다시 뽑는다.
export function generateRandomPassword(length = 10): string {
  let result: string;
  do {
    result = '';
    for (let i = 0; i < length; i++) {
      result +=
        RANDOM_PASSWORD_CHARS[
          Math.floor(Math.random() * RANDOM_PASSWORD_CHARS.length)
        ];
    }
  } while (!isValidPassword(result));
  return result;
}

export function formatPhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}
