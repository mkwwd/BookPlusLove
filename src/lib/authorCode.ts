// 리재철 한글순도서기호법(5표) 기반 저자기호 계산.
// 이름의 첫 글자는 그대로 쓰고, 둘째 글자를 초성/중성 숫자로 바꿔 붙인 뒤
// 도서명 첫 글자의 초성을 이어붙여 완전한 저자기호+도서기호를 만든다.
// 예: "히가시노 게이고" + "나미야 잡화점의 기적" -> "게68ㄴ"

const CHOSEONG = [
  'ㄱ',
  'ㄲ',
  'ㄴ',
  'ㄷ',
  'ㄸ',
  'ㄹ',
  'ㅁ',
  'ㅂ',
  'ㅃ',
  'ㅅ',
  'ㅆ',
  'ㅇ',
  'ㅈ',
  'ㅉ',
  'ㅊ',
  'ㅋ',
  'ㅌ',
  'ㅍ',
  'ㅎ',
];

const JUNGSEONG = [
  'ㅏ',
  'ㅐ',
  'ㅑ',
  'ㅒ',
  'ㅓ',
  'ㅔ',
  'ㅕ',
  'ㅖ',
  'ㅗ',
  'ㅘ',
  'ㅙ',
  'ㅚ',
  'ㅛ',
  'ㅜ',
  'ㅝ',
  'ㅞ',
  'ㅟ',
  'ㅠ',
  'ㅡ',
  'ㅢ',
  'ㅣ',
];

const CONSONANT_DIGIT: Record<string, string> = {
  ㄱ: '1',
  ㄲ: '1',
  ㄴ: '19',
  ㄷ: '2',
  ㄸ: '2',
  ㄹ: '29',
  ㅁ: '3',
  ㅂ: '4',
  ㅃ: '4',
  ㅅ: '5',
  ㅆ: '5',
  ㅇ: '6',
  ㅈ: '7',
  ㅉ: '7',
  ㅊ: '8',
  ㅋ: '87',
  ㅌ: '88',
  ㅍ: '89',
  ㅎ: '9',
};

const VOWEL_DIGIT: Record<string, string> = {
  ㅏ: '2',
  ㅐ: '3',
  ㅑ: '3',
  ㅒ: '3',
  ㅓ: '4',
  ㅔ: '4',
  ㅕ: '4',
  ㅖ: '4',
  ㅗ: '5',
  ㅘ: '5',
  ㅙ: '5',
  ㅚ: '5',
  ㅛ: '5',
  ㅜ: '6',
  ㅝ: '6',
  ㅞ: '6',
  ㅟ: '6',
  ㅠ: '6',
  ㅡ: '7',
  ㅢ: '7',
  ㅣ: '8',
};

function decomposeSyllable(
  char: string,
): { initial: string; medial: string } | null {
  const code = char.codePointAt(0);
  if (code === undefined || code < 0xac00 || code > 0xd7a3) return null;
  const offset = code - 0xac00;
  const initial = CHOSEONG[Math.floor(offset / (21 * 28))];
  const medial = JUNGSEONG[Math.floor((offset % (21 * 28)) / 28)];
  return { initial, medial };
}

// "지은이: 한강", "히가시노 게이고 (지은이)" 같은 API 원문에서
// 계산에 쓸 순수 이름만 뽑아낸다. 공백으로 나뉘어 있으면(외국인 성명 표기)
// 뒷부분(이름)을 쓴다.
function extractPrimaryName(author: string): string {
  const firstAuthor = author.split(/[,;]/)[0];
  const cleaned = firstAuthor
    .replace(/지은이|글쓴이|지음|저자|옮긴이|엮음/g, '')
    .replace(/[():：]/g, ' ')
    .trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : '';
}

/**
 * 저자기호 + 도서기호를 계산한다. 이름/제목이 한글 2글자 이상이 아니면
 * 계산할 수 없어 null을 반환한다 (스태프가 직접 입력해야 함).
 */
export function generateAuthorCode(
  author: string,
  title: string,
): string | null {
  const name = extractPrimaryName(author);
  if (name.length < 2) return null;

  const second = decomposeSyllable(name[1]);
  if (!second) return null;

  const consonantDigit = CONSONANT_DIGIT[second.initial];
  const vowelDigit = VOWEL_DIGIT[second.medial];
  if (!consonantDigit || !vowelDigit) return null;

  const titleChar = title.trim()[0];
  const titleInitial = titleChar ? decomposeSyllable(titleChar) : null;

  return (
    name[0] +
    consonantDigit +
    vowelDigit +
    (titleInitial ? titleInitial.initial : '')
  );
}
