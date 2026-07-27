// 서지 API의 저자 필드는 역할 표기가 뒤에 붙기도("정약용 지음"),
// 앞에 붙기도("저자 : 정약용") 하고, 구분자도 세미콜론(;)/쉼표(,)가
// 섞여 온다. 지금은 옮긴이/그림 등은 빼고 저자(지은이)만 남긴다.
const AUTHOR_ROLE_WORDS = ['지은이', '지음', '저자', '저'];
const NON_AUTHOR_ROLE_WORDS = [
  '옮긴이',
  '옮김',
  '역자',
  '역',
  '그림',
  '삽화',
  '엮은이',
  '엮음',
  '편저',
  '편집',
  '편',
];

// 알아서 부분 문자열로 겹치는 단어("저"가 "저자"의 앞부분인 경우 등)가
// 먼저 매칭되지 않도록 긴 단어부터 시도한다.
const ROLE_WORDS_BY_LENGTH = [
  ...AUTHOR_ROLE_WORDS,
  ...NON_AUTHOR_ROLE_WORDS,
].sort((a, b) => b.length - a.length);
const ROLE_ALTERNATION = ROLE_WORDS_BY_LENGTH.join('|');
const LEADING_ROLE = new RegExp(`^(${ROLE_ALTERNATION})\\s*[:：]?\\s*`);
const TRAILING_ROLE = new RegExp(`\\s*(${ROLE_ALTERNATION})$`);

function splitRole(segment: string): { role: string | null; name: string } {
  const leading = segment.match(LEADING_ROLE);
  if (leading) {
    return { role: leading[1], name: segment.slice(leading[0].length).trim() };
  }
  const trailing = segment.match(TRAILING_ROLE);
  if (trailing) {
    return {
      role: trailing[1],
      name: segment.slice(0, segment.length - trailing[0].length).trim(),
    };
  }
  return { role: null, name: segment };
}

export function extractAuthorName(raw: string): string {
  const segments = raw
    .split(/[;,]/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (segments.length === 0) return raw.trim();

  const parsed = segments.map(splitRole);
  const authorParsed = parsed.filter(
    ({ role }) => !(role && NON_AUTHOR_ROLE_WORDS.includes(role)),
  );

  if (authorParsed.length === 0) return raw.trim();

  // 아무 역할 표기도 없이 쉼표로만 나열된 경우("기시미 이치로, 고가
  // 후미타케")는 공동저자로 보고 전부 남긴다. 반면 역할 표기가 붙어
  // 있는데 옮긴이 등이 "저자"로 잘못 라벨링돼 여러 명이 남는 경우는
  // 대표 저자 한 명만 저장한다.
  const hasAnyRoleLabel = parsed.some(({ role }) => role !== null);
  if (!hasAnyRoleLabel) {
    return authorParsed.map(({ name }) => name).join(', ');
  }

  return authorParsed[0].name;
}
