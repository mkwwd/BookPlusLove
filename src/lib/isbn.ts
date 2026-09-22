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

// 조회(검색) 목적으로는 체크섬까지 맞을 필요 없다 — 옛날 장서 데이터엔
// 오타로 체크섬이 안 맞는 ISBN이 많아서, 자릿수만 맞으면 일단 API 조회를
// 시도해보고 결과가 없으면 그때 안내하는 게 낫다. 체크섬 검증
// 조회에는 looksLikeIsbn을 사용하고 저장/스캔의 검증은 호출부에서 결정한다.
export function looksLikeIsbn(value: string): boolean {
  const cleaned = value.replace(/[^0-9Xx]/g, '').toUpperCase();
  if (cleaned.length === 13) return /^\d{13}$/.test(cleaned);
  if (cleaned.length === 10) return /^\d{9}[0-9X]$/.test(cleaned);
  return false;
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
