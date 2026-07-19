export const EMAIL_DOMAINS = [
  'gmail.com',
  'naver.com',
  'daum.net',
  'hanmail.net',
];

export const inputClass =
  'w-full rounded border border-amber-900/20 bg-white/50 px-4 py-3 text-base placeholder:text-amber-900/50 focus:ring-2 focus:ring-amber-900/30 focus:outline-none';

export default function EmailFields({
  emailId,
  emailDomain,
  onEmailIdChange,
  onEmailDomainChange,
}: {
  emailId: string;
  emailDomain: string;
  onEmailIdChange: (value: string) => void;
  onEmailDomainChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={emailId}
          onChange={(e) => onEmailIdChange(e.target.value)}
          placeholder="이메일"
          className={inputClass}
        />
        <span className="text-amber-900">@</span>
        <input
          type="text"
          value={emailDomain}
          onChange={(e) => onEmailDomainChange(e.target.value)}
          placeholder="도메인"
          className={inputClass}
        />
      </div>
      <select
        value={EMAIL_DOMAINS.includes(emailDomain) ? emailDomain : ''}
        onChange={(e) => onEmailDomainChange(e.target.value)}
        className={`${inputClass} sm:w-auto sm:shrink-0`}>
        <option value="">직접입력</option>
        {EMAIL_DOMAINS.map((domain) => (
          <option key={domain} value={domain}>
            {domain}
          </option>
        ))}
      </select>
    </div>
  );
}
