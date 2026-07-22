'use client';

import { useState } from 'react';

import { useMutation } from '@tanstack/react-query';
import { Eye, EyeOff, Search } from 'lucide-react';

import EmailFields from '@/components/EmailFields';
import ParishSearchModal, {
  SelectedParish,
} from '@/components/ParishSearchModal';

const PHONE_REGEX = /^01[0-9]-?\d{3,4}-?\d{4}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SPECIAL_CHAR_REGEX = /[^a-zA-Z0-9]/;

const CURRENT_YEAR = new Date().getFullYear();
const BIRTH_YEARS = Array.from({ length: 111 }, (_, i) => CURRENT_YEAR - i);
const BIRTH_MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

function getDaysInMonth(year: string, month: string) {
  if (!year || !month) return 31;
  return new Date(Number(year), Number(month), 0).getDate();
}

function formatPhoneNumber(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  if (digits.length <= 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

interface FormErrors {
  name?: string;
  phone?: string;
  email?: string;
  userId?: string;
  password?: string;
  passwordLength?: string;
  passwordSpecialChar?: string;
  passwordConfirm?: string;
  birthdate?: string;
}

export interface RegisteredMember {
  id: number;
  name: string;
}

export default function MemberRegisterForm({
  onSuccess,
  submitLabel = '회원가입',
}: {
  onSuccess: (member: RegisteredMember) => void;
  submitLabel?: string;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [parish, setParish] = useState<SelectedParish | null>(null);
  const [isParishModalOpen, setIsParishModalOpen] = useState(false);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [emailId, setEmailId] = useState('');
  const [emailDomain, setEmailDomain] = useState('');
  const [userId, setUserId] = useState('');
  const [userIdCheckStatus, setUserIdCheckStatus] = useState<
    'idle' | 'available' | 'taken'
  >('idle');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthDay, setBirthDay] = useState('');
  const [baptismalName, setBaptismalName] = useState('');

  const [errors, setErrors] = useState<FormErrors>({});

  const email = `${emailId}@${emailDomain}`;
  const birthdate =
    birthYear && birthMonth && birthDay
      ? `${birthYear}-${birthMonth.padStart(2, '0')}-${birthDay.padStart(2, '0')}`
      : '';
  const daysInSelectedMonth = getDaysInMonth(birthYear, birthMonth);

  const validateUserIdValue = (value: string) => {
    if (!value.trim()) return '아이디를 입력해주세요';
    if (value.length < 4 || value.length > 12)
      return '아이디는 4~12자로 입력해주세요';
    return undefined;
  };

  const validatePasswordRequired = (value: string) =>
    !value ? '비밀번호를 입력해주세요' : undefined;

  const validatePasswordLength = (value: string) =>
    value && value.length < 8 ? '8자 이상이어야 합니다' : undefined;

  const validatePasswordSpecialChar = (value: string) =>
    value && !SPECIAL_CHAR_REGEX.test(value)
      ? '특수문자를 포함해야 합니다'
      : undefined;

  const validatePasswordConfirmValue = (pw: string, confirm: string) => {
    if (!confirm) return '비밀번호 확인을 입력해주세요';
    if (pw !== confirm) return '비밀번호가 일치하지 않습니다';
    return undefined;
  };

  const validate = (): FormErrors => {
    const nextErrors: FormErrors = {};

    if (!name.trim()) {
      nextErrors.name = '이름을 입력해주세요';
    }

    if (!phone.trim()) {
      nextErrors.phone = '핸드폰번호를 입력해주세요';
    } else if (!PHONE_REGEX.test(phone.trim())) {
      nextErrors.phone = '올바른 핸드폰번호 형식이 아닙니다';
    }

    if (!emailId.trim() || !emailDomain.trim()) {
      nextErrors.email = '이메일을 입력해주세요';
    } else if (!EMAIL_REGEX.test(email.trim())) {
      nextErrors.email = '올바른 이메일 형식이 아닙니다';
    }

    nextErrors.userId = validateUserIdValue(userId);
    nextErrors.password = validatePasswordRequired(password);
    nextErrors.passwordLength = validatePasswordLength(password);
    nextErrors.passwordSpecialChar = validatePasswordSpecialChar(password);

    nextErrors.passwordConfirm = validatePasswordConfirmValue(
      password,
      passwordConfirm,
    );

    if (!birthYear || !birthMonth || !birthDay) {
      nextErrors.birthdate = '생년월일을 입력해주세요';
    }

    return nextErrors;
  };

  const {
    mutate: checkUserId,
    isPending: isCheckingUserId,
    error: userIdCheckError,
  } = useMutation({
    mutationFn: async () => {
      const res = await fetch(
        `/api/users/check-user-id?userId=${encodeURIComponent(userId)}`,
      );
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? '중복 확인에 실패했습니다.');
      return body.available as boolean;
    },
    onSuccess: (available) => {
      setUserIdCheckStatus(available ? 'available' : 'taken');
    },
  });

  const {
    mutate: registerMember,
    isPending: isSubmitting,
    error: submitError,
  } = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          email,
          userId,
          password,
          birthdate,
          baptismalName,
          parishId: parish?.id ?? null,
        }),
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? '회원가입에 실패했습니다.');
      return body as { id: number; name: string };
    },
    onSuccess: (body) => onSuccess({ id: body.id, name: body.name }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.values(nextErrors).every((message) => !message)) {
      registerMember();
    }
  };

  return (
    <>
      <form className="space-y-6" onSubmit={handleSubmit} noValidate>
        <div>
          <label className="mb-2 block text-base font-medium text-amber-900">
            이름 <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="이름을 입력해주세요"
            className="w-full rounded border border-amber-900/20 bg-white/50 px-4 py-3 text-base placeholder:text-amber-900/50 focus:ring-2 focus:ring-amber-900/30 focus:outline-none"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name}</p>
          )}
        </div>

        <div>
          <label className="mb-2 block text-base font-medium text-amber-900">
            핸드폰번호 <span className="text-red-600">*</span>
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
            placeholder="010-1234-5678"
            className="w-full rounded border border-amber-900/20 bg-white/50 px-4 py-3 text-base placeholder:text-amber-900/50 focus:ring-2 focus:ring-amber-900/30 focus:outline-none"
          />
          {errors.phone && (
            <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
          )}
        </div>

        <div>
          <label className="mb-2 block text-base font-medium text-amber-900">
            이메일 <span className="text-red-600">*</span>
          </label>
          <EmailFields
            emailId={emailId}
            emailDomain={emailDomain}
            onEmailIdChange={setEmailId}
            onEmailDomainChange={setEmailDomain}
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email}</p>
          )}
        </div>

        <div>
          <label className="mb-2 block text-base font-medium text-amber-900">
            아이디 <span className="text-red-600">*</span>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={userId}
              onChange={(e) => {
                const value = e.target.value;
                setUserId(value);
                setUserIdCheckStatus('idle');
                setErrors((prev) => ({
                  ...prev,
                  userId: validateUserIdValue(value),
                }));
              }}
              placeholder="아이디를 입력해주세요 (4~12자)"
              className="w-full rounded border border-amber-900/20 bg-white/50 px-4 py-3 text-base placeholder:text-amber-900/50 focus:ring-2 focus:ring-amber-900/30 focus:outline-none"
            />
            <button
              type="button"
              disabled={isCheckingUserId}
              onClick={() => {
                const error = validateUserIdValue(userId);
                setErrors((prev) => ({ ...prev, userId: error }));
                if (!error) checkUserId();
              }}
              className="flex shrink-0 items-center rounded border border-amber-900/20 bg-white/50 px-4 py-3 text-base text-amber-900 hover:bg-amber-50 focus:ring-2 focus:ring-amber-900/30 focus:outline-none disabled:opacity-50">
              {isCheckingUserId ? '확인 중...' : '중복확인'}
            </button>
          </div>
          {errors.userId && (
            <p className="mt-1 text-sm text-red-600">{errors.userId}</p>
          )}
          {userIdCheckStatus === 'available' && (
            <p className="mt-1 text-sm text-green-600">
              사용 가능한 아이디입니다
            </p>
          )}
          {userIdCheckStatus === 'taken' && (
            <p className="mt-1 text-sm text-red-600">
              이미 사용 중인 아이디입니다
            </p>
          )}
          {userIdCheckError && (
            <p className="mt-1 text-sm text-red-600">
              {userIdCheckError.message}
            </p>
          )}
        </div>

        <div>
          <label className="mb-2 block text-base font-medium text-amber-900">
            비밀번호 <span className="text-red-600">*</span>
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                const value = e.target.value;
                setPassword(value);
                setErrors((prev) => ({
                  ...prev,
                  password: validatePasswordRequired(value),
                  passwordLength: validatePasswordLength(value),
                  passwordSpecialChar: validatePasswordSpecialChar(value),
                  passwordConfirm: passwordConfirm
                    ? validatePasswordConfirmValue(value, passwordConfirm)
                    : prev.passwordConfirm,
                }));
              }}
              placeholder="8자 이상, 특수문자 포함"
              className="w-full rounded border border-amber-900/20 bg-white/50 px-4 py-3 text-base placeholder:text-amber-900/50 focus:ring-2 focus:ring-amber-900/30 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute top-3 right-3 cursor-pointer text-amber-900 hover:text-red-800">
              {showPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-sm text-red-600">{errors.password}</p>
          )}
          {errors.passwordLength && (
            <p className="mt-1 text-sm text-red-600">{errors.passwordLength}</p>
          )}
          {errors.passwordSpecialChar && (
            <p className="mt-1 text-sm text-red-600">
              {errors.passwordSpecialChar}
            </p>
          )}
        </div>

        <div>
          <label className="mb-2 block text-base font-medium text-amber-900">
            비밀번호 확인 <span className="text-red-600">*</span>
          </label>
          <input
            type={showPassword ? 'text' : 'password'}
            value={passwordConfirm}
            onChange={(e) => {
              const value = e.target.value;
              setPasswordConfirm(value);
              setErrors((prev) => ({
                ...prev,
                passwordConfirm: validatePasswordConfirmValue(password, value),
              }));
            }}
            placeholder="비밀번호를 다시 입력해주세요"
            className="w-full rounded border border-amber-900/20 bg-white/50 px-4 py-3 text-base placeholder:text-amber-900/50 focus:ring-2 focus:ring-amber-900/30 focus:outline-none"
          />
          {errors.passwordConfirm && (
            <p className="mt-1 text-sm text-red-600">
              {errors.passwordConfirm}
            </p>
          )}
        </div>

        <div>
          <label className="mb-2 block text-base font-medium text-amber-900">
            생년월일 <span className="text-red-600">*</span>
          </label>
          <div className="flex gap-2">
            <select
              value={birthYear}
              onChange={(e) => {
                const value = e.target.value;
                setBirthYear(value);
                if (Number(birthDay) > getDaysInMonth(value, birthMonth)) {
                  setBirthDay('');
                }
              }}
              className="w-full rounded border border-amber-900/20 bg-white/50 px-3 py-3 text-base text-amber-900 focus:ring-2 focus:ring-amber-900/30 focus:outline-none">
              <option value="">년</option>
              {BIRTH_YEARS.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <select
              value={birthMonth}
              onChange={(e) => {
                const value = e.target.value;
                setBirthMonth(value);
                if (Number(birthDay) > getDaysInMonth(birthYear, value)) {
                  setBirthDay('');
                }
              }}
              className="w-full rounded border border-amber-900/20 bg-white/50 px-3 py-3 text-base text-amber-900 focus:ring-2 focus:ring-amber-900/30 focus:outline-none">
              <option value="">월</option>
              {BIRTH_MONTHS.map((month) => (
                <option key={month} value={month}>
                  {month}
                </option>
              ))}
            </select>
            <select
              value={birthDay}
              onChange={(e) => setBirthDay(e.target.value)}
              className="w-full rounded border border-amber-900/20 bg-white/50 px-3 py-3 text-base text-amber-900 focus:ring-2 focus:ring-amber-900/30 focus:outline-none">
              <option value="">일</option>
              {Array.from({ length: daysInSelectedMonth }, (_, i) => i + 1).map(
                (day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ),
              )}
            </select>
          </div>
          {errors.birthdate && (
            <p className="mt-1 text-sm text-red-600">{errors.birthdate}</p>
          )}
        </div>

        <div>
          <label className="mb-2 block text-base font-medium text-amber-900">
            세례명
          </label>
          <input
            type="text"
            value={baptismalName}
            onChange={(e) => setBaptismalName(e.target.value)}
            placeholder="세례명을 입력해주세요"
            className="w-full rounded border border-amber-900/20 bg-white/50 px-4 py-3 text-base placeholder:text-amber-900/50 focus:ring-2 focus:ring-amber-900/30 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-2 block text-base font-medium text-amber-900">
            본당
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={parish?.name ?? ''}
              placeholder="소속 본당을 검색해주세요"
              className="w-full rounded border border-amber-900/20 bg-white/50 px-4 py-3 text-base placeholder:text-amber-900/50 focus:ring-2 focus:ring-amber-900/30 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setIsParishModalOpen(true)}
              className="flex shrink-0 items-center gap-1 rounded border border-amber-900/20 bg-white/50 px-4 py-3 text-base text-amber-900 hover:bg-amber-50 focus:ring-2 focus:ring-amber-900/30 focus:outline-none">
              <Search className="h-4 w-4" />
              검색
            </button>
          </div>
        </div>

        {submitError && (
          <p className="text-center text-base text-red-600">
            {submitError.message}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded bg-red-900 py-3 text-lg font-medium text-white transition hover:bg-red-800 disabled:opacity-50">
          {isSubmitting ? '가입 처리 중...' : submitLabel}
        </button>
      </form>

      {isParishModalOpen && (
        <ParishSearchModal
          onClose={() => setIsParishModalOpen(false)}
          onSelect={(selected) => {
            setParish(selected);
            setIsParishModalOpen(false);
          }}
        />
      )}
    </>
  );
}
