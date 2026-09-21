'use client';

import { useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff, Search, UserPlus } from 'lucide-react';

import EmailFields from '@/components/EmailFields';
import MemberRegisterForm from '@/components/MemberRegisterForm';
import Modal from '@/components/Modal';
import ParishSearchModal, {
  SelectedParish,
} from '@/components/ParishSearchModal';
import {
  BIRTH_MONTHS,
  BIRTH_YEARS,
  formatBirthdate,
  getDaysInMonth,
  parseBirthdate,
} from '@/lib/birthdate';
import { isSyntheticEmail } from '@/lib/email';
import {
  formatPhoneNumber,
  generateRandomPassword,
  isValidPassword,
} from '@/lib/validation';

const ROLE_STYLE: Record<string, string> = {
  ADMIN: 'bg-red-100 text-red-800',
  USER: 'bg-amber-100 text-amber-800',
};

const ROLE_LABEL: Record<string, string> = {
  ADMIN: '관리자',
  USER: '일반회원',
};

// 회원이 기억하기 쉬운 초기화 비밀번호. 8자 이상 + 특수문자 포함
// 정책은 그대로 지키면서, 관리자가 전화로 불러주기 쉬운 값으로 정했다.
const DEFAULT_RESET_PASSWORD = '@0000000';

const MAX_ADMIN_COUNT = 5;

interface Member {
  id: number;
  userId: string;
  name: string;
  email: string;
  phone: string;
  birthdate: string | null;
  address: string | null;
  baptismalName: string | null;
  parishName: string | null;
  joinedAt: string;
  role: string;
}

function displayEmail(email: string): string {
  return isSyntheticEmail(email) ? '-' : email;
}

function MemberDetailModal({
  member,
  adminCount,
  onClose,
  onChanged,
}: {
  member: Member;
  adminCount: number;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [name, setName] = useState(member.name);
  const [phone, setPhone] = useState(member.phone);

  const initialEmail = isSyntheticEmail(member.email) ? '' : member.email;
  const [emailId, setEmailId] = useState(initialEmail.split('@')[0] ?? '');
  const [emailDomain, setEmailDomain] = useState(
    initialEmail.split('@')[1] ?? '',
  );

  const parsedBirth = parseBirthdate(member.birthdate);
  const [birthYear, setBirthYear] = useState(parsedBirth.year);
  const [birthMonth, setBirthMonth] = useState(parsedBirth.month);
  const [birthDay, setBirthDay] = useState(parsedBirth.day);
  const daysInSelectedMonth = getDaysInMonth(birthYear, birthMonth);

  const [baptismalName, setBaptismalName] = useState(
    member.baptismalName ?? '',
  );
  const [address, setAddress] = useState(member.address ?? '');
  const [parish, setParish] = useState<SelectedParish | null>(null);
  const [isParishModalOpen, setIsParishModalOpen] = useState(false);
  const [role, setRole] = useState(member.role);

  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  const {
    mutate: save,
    isPending: isSaving,
    error: saveError,
  } = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/members/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          email:
            emailId.trim() && emailDomain.trim()
              ? `${emailId.trim()}@${emailDomain.trim()}`
              : '',
          birthdate: formatBirthdate(birthYear, birthMonth, birthDay),
          baptismalName: baptismalName.trim(),
          address: address.trim(),
          ...(parish ? { parishId: parish.id } : {}),
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? '저장에 실패했습니다.');
    },
    onSuccess: () => {
      onChanged();
      onClose();
    },
  });

  const {
    mutate: changeRole,
    isPending: isChangingRole,
    error: roleChangeError,
  } = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/members/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? '권한 변경에 실패했습니다.');
    },
    onSuccess: () => {
      onChanged();
      onClose();
    },
  });

  const {
    mutate: removeMember,
    isPending: isDeleting,
    error: deleteError,
  } = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/members/${member.id}`, {
        method: 'DELETE',
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? '삭제에 실패했습니다.');
    },
    onSuccess: () => {
      onChanged();
      onClose();
    },
  });

  const {
    mutate: resetPassword,
    isPending: isResettingPassword,
    isSuccess: isPasswordResetDone,
    error: passwordResetError,
  } = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/members/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      });
      const body = await res.json();
      if (!res.ok)
        throw new Error(body.error ?? '비밀번호 변경에 실패했습니다.');
    },
  });

  const handleChangeRole = () => {
    if (
      window.confirm(
        `${member.name}님의 권한을 ${ROLE_LABEL[role]}(으)로 변경할까요?`,
      )
    ) {
      changeRole();
    }
  };

  const handleResetPassword = () => {
    if (!isValidPassword(newPassword)) return;
    if (
      window.confirm(
        `${member.name}님의 비밀번호를 초기화할까요? 새 비밀번호를 회원에게 직접 전달해주셔야 해요.`,
      )
    ) {
      resetPassword();
    }
  };

  const handleDelete = () => {
    if (
      window.confirm(
        `${member.name}님을 정말 탈퇴(삭제)시키겠습니까? 이 작업은 되돌릴 수 없습니다.`,
      )
    ) {
      removeMember();
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="mb-1.5 text-sm text-amber-800">아이디</p>
          <p className="text-base text-amber-950">{member.userId}</p>
        </div>
        <div>
          <p className="mb-1.5 text-sm text-amber-800">가입일</p>
          <p className="text-base text-amber-950">
            {member.joinedAt.slice(0, 10)}
          </p>
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-amber-800">이름</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded border border-amber-900/20 bg-white/50 px-3 py-2 text-base focus:ring-2 focus:ring-amber-900/30 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm text-amber-800">
            전화번호
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
            className="w-full rounded border border-amber-900/20 bg-white/50 px-3 py-2 text-base focus:ring-2 focus:ring-amber-900/30 focus:outline-none"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-sm text-amber-800">
            이메일 (선택)
          </label>
          <EmailFields
            emailId={emailId}
            emailDomain={emailDomain}
            onEmailIdChange={setEmailId}
            onEmailDomainChange={setEmailDomain}
          />
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-sm text-amber-800">
            생년월일 (선택)
          </label>
          <div className="flex gap-2">
            <select
              value={birthYear}
              onChange={(e) => {
                setBirthYear(e.target.value);
                if (
                  Number(birthDay) > getDaysInMonth(e.target.value, birthMonth)
                ) {
                  setBirthDay('');
                }
              }}
              className="w-full rounded border border-amber-900/20 bg-white/50 px-2 py-2 text-base focus:ring-2 focus:ring-amber-900/30 focus:outline-none">
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
                setBirthMonth(e.target.value);
                if (
                  Number(birthDay) > getDaysInMonth(birthYear, e.target.value)
                ) {
                  setBirthDay('');
                }
              }}
              className="w-full rounded border border-amber-900/20 bg-white/50 px-2 py-2 text-base focus:ring-2 focus:ring-amber-900/30 focus:outline-none">
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
              className="w-full rounded border border-amber-900/20 bg-white/50 px-2 py-2 text-base focus:ring-2 focus:ring-amber-900/30 focus:outline-none">
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
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-amber-800">세례명</label>
          <input
            type="text"
            value={baptismalName}
            onChange={(e) => setBaptismalName(e.target.value)}
            className="w-full rounded border border-amber-900/20 bg-white/50 px-3 py-2 text-base focus:ring-2 focus:ring-amber-900/30 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm text-amber-800">본당</label>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={parish?.name ?? member.parishName ?? ''}
              placeholder="변경하려면 검색"
              className="w-full rounded border border-amber-900/20 bg-white/50 px-3 py-2 text-base placeholder:text-amber-900/40 focus:ring-2 focus:ring-amber-900/30 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setIsParishModalOpen(true)}
              className="shrink-0 rounded border border-amber-900/20 bg-white/50 px-3 py-2 text-sm text-amber-950 hover:bg-amber-50">
              검색
            </button>
          </div>
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-sm text-amber-800">주소</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full rounded border border-amber-900/20 bg-white/50 px-3 py-2 text-base focus:ring-2 focus:ring-amber-900/30 focus:outline-none"
          />
        </div>
      </div>

      {saveError && <p className="text-sm text-red-600">{saveError.message}</p>}
      <button
        type="button"
        disabled={isSaving}
        onClick={() => save()}
        className="block w-full rounded bg-red-900 px-5 py-2.5 text-base font-medium text-white transition hover:bg-red-800 disabled:opacity-50 sm:w-auto">
        {isSaving ? '저장 중...' : '정보 저장'}
      </button>

      <div className="border-t border-amber-900/10 pt-4">
        <label className="mb-1.5 block text-base font-medium text-amber-950">
          권한
        </label>
        {member.role !== 'ADMIN' && adminCount >= MAX_ADMIN_COUNT && (
          <p className="mb-1.5 text-sm text-amber-800">
            관리자가 이미 {MAX_ADMIN_COUNT}명이라 더 지정할 수 없어요.
          </p>
        )}
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="w-full rounded border border-amber-900/20 bg-white/50 px-3 py-2.5 text-base text-amber-950 focus:ring-2 focus:ring-amber-900/30 focus:outline-none sm:w-auto">
          <option value="USER">일반회원</option>
          <option
            value="ADMIN"
            disabled={member.role !== 'ADMIN' && adminCount >= MAX_ADMIN_COUNT}>
            관리자
          </option>
        </select>

        {roleChangeError && (
          <p className="mt-2 text-sm text-red-600">{roleChangeError.message}</p>
        )}

        <button
          type="button"
          disabled={role === member.role || isChangingRole}
          onClick={handleChangeRole}
          className="mt-3 block w-full rounded bg-red-900 px-5 py-2.5 text-base font-medium text-white transition hover:bg-red-800 disabled:opacity-50 sm:w-auto">
          {isChangingRole ? '변경 중...' : '권한 변경'}
        </button>
      </div>

      <div className="border-t border-amber-900/10 pt-4">
        <label className="mb-1.5 block text-base font-medium text-amber-950">
          비밀번호 초기화
        </label>
        <div className="flex gap-2">
          <div className="relative w-full">
            <input
              type={showNewPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="8자 이상, 특수문자 포함"
              className="w-full rounded border border-amber-900/20 bg-white/50 px-3 py-2.5 text-base placeholder:text-amber-900/40 focus:ring-2 focus:ring-amber-900/30 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-amber-950 hover:text-red-800">
              {showNewPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          <button
            type="button"
            onClick={() => setNewPassword(DEFAULT_RESET_PASSWORD)}
            className="shrink-0 rounded border border-amber-900/20 bg-white/50 px-3 py-2.5 text-sm text-amber-950 hover:bg-amber-50">
            초기값
          </button>
          <button
            type="button"
            onClick={() => setNewPassword(generateRandomPassword())}
            className="shrink-0 rounded border border-amber-900/20 bg-white/50 px-3 py-2.5 text-sm text-amber-950 hover:bg-amber-50">
            무작위 생성
          </button>
        </div>

        {newPassword && !isValidPassword(newPassword) && (
          <p className="mt-2 text-sm text-red-600">
            8자 이상, 특수문자를 포함해야 합니다.
          </p>
        )}
        {passwordResetError && (
          <p className="mt-2 text-sm text-red-600">
            {passwordResetError.message}
          </p>
        )}
        {isPasswordResetDone && (
          <p className="mt-2 text-sm text-amber-950">
            비밀번호가 변경됐어요. 회원에게 직접 전달해주세요.
          </p>
        )}

        <button
          type="button"
          disabled={!isValidPassword(newPassword) || isResettingPassword}
          onClick={handleResetPassword}
          className="mt-3 block w-full rounded bg-red-900 px-5 py-2.5 text-base font-medium text-white transition hover:bg-red-800 disabled:opacity-50 sm:w-auto">
          {isResettingPassword ? '변경 중...' : '비밀번호 변경'}
        </button>
      </div>

      <div className="border-t border-amber-900/10 pt-4">
        {deleteError && (
          <p className="mb-2 text-sm text-red-600">{deleteError.message}</p>
        )}
        <button
          type="button"
          disabled={isDeleting}
          onClick={handleDelete}
          className="w-full rounded border border-red-800 px-5 py-2.5 text-base font-medium text-red-800 transition hover:bg-red-50 disabled:opacity-50 sm:w-auto">
          {isDeleting ? '탈퇴 처리 중...' : '회원 탈퇴(삭제)'}
        </button>
      </div>

      {isParishModalOpen && (
        <ParishSearchModal
          onClose={() => setIsParishModalOpen(false)}
          onSelect={(selected) => {
            setParish(selected);
            setIsParishModalOpen(false);
          }}
        />
      )}
    </div>
  );
}

function MembersTable({
  members,
  isLoading,
  emptyText,
  onSelect,
}: {
  members: Member[];
  isLoading: boolean;
  emptyText: string;
  onSelect: (member: Member) => void;
}) {
  return (
    <div>
      <div className="overflow-x-auto rounded-lg border border-amber-900/20 bg-white/40 shadow-sm backdrop-blur-sm">
        <table className="w-full min-w-max text-left text-base whitespace-nowrap">
          <thead className="border-b border-amber-900/20 text-amber-800">
            <tr>
              <th className="px-5 py-3 font-medium">아이디</th>
              <th className="px-5 py-3 font-medium">이름</th>
              <th className="px-5 py-3 font-medium">이메일</th>
              <th className="px-5 py-3 font-medium">가입일</th>
              <th className="px-5 py-3 font-medium">권한</th>
              <th className="px-5 py-3 font-medium">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-amber-900/10">
            {isLoading ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-5 py-8 text-center text-amber-900/50">
                  불러오는 중...
                </td>
              </tr>
            ) : members.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-5 py-8 text-center text-amber-900/50">
                  {emptyText}
                </td>
              </tr>
            ) : (
              members.map((member) => (
                <tr key={member.id}>
                  <td className="px-5 py-3 text-amber-950">{member.userId}</td>
                  <td className="px-5 py-3 text-amber-950">{member.name}</td>
                  <td className="px-5 py-3 text-amber-800">
                    {displayEmail(member.email)}
                  </td>
                  <td className="px-5 py-3 text-amber-800">
                    {member.joinedAt.slice(0, 10)}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`rounded px-2 py-1 text-sm font-medium ${ROLE_STYLE[member.role]}`}>
                      {member.role}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <button
                      type="button"
                      onClick={() => onSelect(member)}
                      className="text-sm text-amber-800 hover:text-amber-950 hover:underline">
                      상세보기
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AdminMembersPage() {
  const queryClient = useQueryClient();
  const [searchText, setSearchText] = useState('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'admin' | 'regular'>('admin');

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['admin-members'],
    queryFn: async () => {
      const res = await fetch('/api/admin/members');
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? '목록 조회에 실패했습니다.');
      return body.members as Member[];
    },
  });

  const trimmedSearch = searchText.trim();
  const visibleMembers = members.filter(
    (member) =>
      !trimmedSearch ||
      member.userId.includes(trimmedSearch) ||
      member.name.includes(trimmedSearch) ||
      member.email.includes(trimmedSearch),
  );

  const adminCount = members.filter((member) => member.role === 'ADMIN').length;
  const adminMembers = visibleMembers.filter(
    (member) => member.role === 'ADMIN',
  );
  const regularMembers = visibleMembers.filter(
    (member) => member.role !== 'ADMIN',
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-3xl text-amber-950">회원 관리</h2>
        <button
          type="button"
          onClick={() => setIsAddMemberOpen(true)}
          className="flex items-center gap-1.5 rounded bg-red-900 px-4 py-2.5 text-base font-medium text-white transition hover:bg-red-800">
          <UserPlus className="h-4 w-4" />
          회원 추가하기
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-amber-950" />
        <input
          type="text"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="아이디, 이름 또는 이메일 검색"
          className="w-full rounded border border-amber-900/30 bg-white/40 py-2.5 pr-4 pl-9 text-base placeholder:text-amber-900/50 focus:ring-2 focus:ring-amber-900/20 focus:outline-none"
        />
      </div>

      <div className="flex flex-wrap gap-2 border-b border-amber-900/20">
        <button
          type="button"
          onClick={() => setActiveTab('admin')}
          className={`border-b-2 px-4 py-3 text-base transition ${
            activeTab === 'admin'
              ? 'border-red-900 text-red-900'
              : 'border-transparent text-amber-800 hover:text-amber-950'
          }`}>
          관리자 ({adminCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('regular')}
          className={`border-b-2 px-4 py-3 text-base transition ${
            activeTab === 'regular'
              ? 'border-red-900 text-red-900'
              : 'border-transparent text-amber-800 hover:text-amber-950'
          }`}>
          일반회원 ({members.length - adminCount})
        </button>
      </div>

      {activeTab === 'admin' ? (
        <MembersTable
          members={adminMembers}
          isLoading={isLoading}
          emptyText="관리자가 없습니다."
          onSelect={setSelectedMember}
        />
      ) : (
        <MembersTable
          members={regularMembers}
          isLoading={isLoading}
          emptyText="회원이 없습니다."
          onSelect={setSelectedMember}
        />
      )}

      {selectedMember && (
        <Modal title="회원 상세정보" onClose={() => setSelectedMember(null)}>
          <MemberDetailModal
            member={selectedMember}
            adminCount={adminCount}
            onClose={() => setSelectedMember(null)}
            onChanged={() => {
              void queryClient.invalidateQueries({
                queryKey: ['admin-members'],
              });
            }}
          />
        </Modal>
      )}

      {isAddMemberOpen && (
        <Modal title="회원 추가" onClose={() => setIsAddMemberOpen(false)}>
          <MemberRegisterForm
            submitLabel="회원 등록"
            onSuccess={() => {
              setIsAddMemberOpen(false);
              void queryClient.invalidateQueries({
                queryKey: ['admin-members'],
              });
            }}
          />
        </Modal>
      )}
    </div>
  );
}
