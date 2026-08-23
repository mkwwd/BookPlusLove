// 책 뒷면에는 보통 바코드가 2개 있다 (ISBN 바코드 + 부가기호/가격 바코드).
// 카메라나 스캐너가 엉뚱한 바코드를 읽었을 때 걸러내기 위해 EAN-13 ISBN
// 형식(978/979로 시작, 체크섬 일치)인지 검증한다.
export function isValidIsbn13(value: string): boolean {
  const digits = value.replace(/[^0-9]/g, '');
  if (digits.length !== 13) return false;
  if (!digits.startsWith('978') && !digits.startsWith('979')) return false;

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += Number(digits[i]) * (i % 2 === 0 ? 1 : 3);
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === Number(digits[12]);
}

// 2007년 이전 도서는 10자리 ISBN(예: 89-7635-447-1)만 있는 경우가 많아,
// 수동 입력으로는 이것도 받아준다. 마지막 체크숫자는 'X'일 수 있다.
export function isValidIsbn10(value: string): boolean {
  const cleaned = value.replace(/[^0-9Xx]/g, '').toUpperCase();
  if (cleaned.length !== 10) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    if (!/[0-9]/.test(cleaned[i])) return false;
    sum += Number(cleaned[i]) * (10 - i);
  }
  const last = cleaned[9];
  if (last !== 'X' && !/[0-9]/.test(last)) return false;
  sum += last === 'X' ? 10 : Number(last);

  return sum % 11 === 0;
}

export function isValidIsbn(value: string): boolean {
  return isValidIsbn13(value) || isValidIsbn10(value);
}

// 10자리 -> 13자리 표준 변환: 앞 9자리 숫자에 "978"을 붙이고 체크숫자를
// 다시 계산한다 (마지막 체크숫자는 버림).
export function convertIsbn10To13(value: string): string {
  const cleaned = value.replace(/[^0-9Xx]/g, '').toUpperCase();
  const core = `978${cleaned.slice(0, 9)}`;

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += Number(core[i]) * (i % 2 === 0 ? 1 : 3);
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return `${core}${checkDigit}`;
}
