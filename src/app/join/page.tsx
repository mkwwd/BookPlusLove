import { useState } from 'react';

import { Eye, EyeOff } from 'lucide-react';

export default function Page0Register() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-amber-50 to-orange-50">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
        <div className="rounded-lg border border-amber-200 bg-white/70 p-6 shadow-sm backdrop-blur-sm sm:p-8">
          <div className="mb-8 text-center">
            <h3 className="mb-2 font-serif text-2xl text-amber-900">
              회원가입
            </h3>
          </div>

          <form className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-amber-900">
                아이디
              </label>
              <input
                type="text"
                placeholder="아이디를 입력해주세요"
                className="w-full rounded border border-amber-200 bg-white/50 px-4 py-3 text-sm placeholder:text-amber-500 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-amber-900">
                비밀번호
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="비밀번호를 입력해주세요"
                  className="w-full rounded border border-amber-200 bg-white/50 px-4 py-3 text-sm placeholder:text-amber-500 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute top-3 right-3 text-amber-600 hover:text-amber-900">
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-amber-900">
                생년월일
              </label>
              <input
                type="date"
                className="w-full rounded border border-amber-200 bg-white/50 px-4 py-3 text-sm placeholder:text-amber-500 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-amber-900">
                주소
              </label>
              <input
                type="text"
                placeholder="주소를 입력해주세요"
                className="w-full rounded border border-amber-200 bg-white/50 px-4 py-3 text-sm placeholder:text-amber-500 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-amber-900">
                세례명
              </label>
              <input
                type="text"
                placeholder="세례명을 입력해주세요"
                className="w-full rounded border border-amber-200 bg-white/50 px-4 py-3 text-sm placeholder:text-amber-500 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-amber-900">
                본당
              </label>
              <input
                type="text"
                placeholder="소속 본당을 입력해주세요"
                className="w-full rounded border border-amber-200 bg-white/50 px-4 py-3 text-sm placeholder:text-amber-500 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded bg-red-900 py-3 text-base font-medium text-white transition hover:bg-red-800">
              회원가입
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
