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
