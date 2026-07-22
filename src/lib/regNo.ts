// 등록번호 형식: MB + 숫자 6자리 (예: MB123456)
const REG_NO_PATTERN = /^MB\d{6}$/;

export function isValidRegNo(value: string): boolean {
  return REG_NO_PATTERN.test(value.trim());
}

// 한글(2벌식) 입력 상태에서 바코드 스캐너가 "MB..."를 입력하면
// 키보드 자판이 한글로 되어 있어 "M"→"ㅡ", "B"→"ㅠ"처럼 자모로 바뀌어
// 들어온다. 등록번호에는 한글이 올 일이 없으므로, 자모가 감지되면
// 2벌식 자판 기준으로 원래 영문 키로 되돌린다.
const JAMO_TO_QWERTY: Record<string, string> = {
  ㅂ: 'q',
  ㅈ: 'w',
  ㄷ: 'e',
  ㄱ: 'r',
  ㅅ: 't',
  ㅛ: 'y',
  ㅕ: 'u',
  ㅑ: 'i',
  ㅐ: 'o',
  ㅔ: 'p',
  ㅁ: 'a',
  ㄴ: 's',
  ㅇ: 'd',
  ㄹ: 'f',
  ㅎ: 'g',
  ㅗ: 'h',
  ㅓ: 'j',
  ㅏ: 'k',
  ㅣ: 'l',
  ㅋ: 'z',
  ㅌ: 'x',
  ㅊ: 'c',
  ㅍ: 'v',
  ㅠ: 'b',
  ㅜ: 'n',
  ㅡ: 'm',
  ㅃ: 'Q',
  ㅉ: 'W',
  ㄸ: 'E',
  ㄲ: 'R',
  ㅆ: 'T',
  ㅒ: 'O',
  ㅖ: 'P',
};

export function normalizeRegNoInput(value: string): string {
  return Array.from(value)
    .map((ch) => JAMO_TO_QWERTY[ch] ?? ch)
    .join('')
    .toUpperCase();
}
