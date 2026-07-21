// 등록번호 형식: MB + 숫자 6자리 (예: MB123456)
const REG_NO_PATTERN = /^MB\d{6}$/;

export function isValidRegNo(value: string): boolean {
  return REG_NO_PATTERN.test(value.trim());
}
