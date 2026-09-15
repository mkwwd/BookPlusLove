'use client';

import { useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, UserPlus } from 'lucide-react';

import MemberRegisterForm from '@/components/MemberRegisterForm';
import Modal from '@/components/Modal';

const ROLE_STYLE: Record<string, string> = {
  ADMIN: 'bg-red-100 text-red-800',
  USER: 'bg-amber-100 text-amber-800',
};

const ROLE_LABEL: Record<string, string> = {
  ADMIN: '관리자',
  USER: '일반회원',
};

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

function MemberDetailModal({
  member,
  onClose,
  onChanged,
}: {
  member: Member;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [role, setRole] = useState(member.role);

  const {
    mutate: save,
    isPending: isSaving,
    error: saveError,
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

  const handleSave = () => {
    if (role === member.role) return;
    if (
      window.confirm(
        `${member.name}님의 권한을 ${ROLE_LABEL[role]}(으)로 변경할까요?`,
      )
    ) {
      save();
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-sm text-amber-800">아이디</p>
          <p className="text-base text-amber-950">{member.userId}</p>
        </div>
        <div>
          <p className="text-sm text-amber-800">이름</p>
          <p className="text-base text-amber-950">{member.name}</p>
        </div>
        <div>
          <p className="text-sm text-amber-800">이메일</p>
          <p className="text-base text-amber-950">{member.email}</p>
        </div>
        <div>
          <p className="text-sm text-amber-800">전화번호</p>
          <p className="text-base text-amber-950">{member.phone}</p>
        </div>
        <div>
          <p className="text-sm text-amber-800">생년월일</p>
          <p className="text-base text-amber-950">{member.birthdate ?? '-'}</p>
        </div>
        <div>
          <p className="text-sm text-amber-800">세례명</p>
          <p className="text-base text-amber-950">
            {member.baptismalName ?? '-'}
          </p>
        </div>
        <div>
          <p className="text-sm text-amber-800">본당</p>
          <p className="text-base text-amber-950">{member.parishName ?? '-'}</p>
        </div>
        <div>
          <p className="text-sm text-amber-800">주소</p>
          <p className="text-base text-amber-950">{member.address ?? '-'}</p>
        </div>
        <div>
          <p className="text-sm text-amber-800">가입일</p>
          <p className="text-base text-amber-950">
            {member.joinedAt.slice(0, 10)}
          </p>
        </div>
      </div>

      <div className="border-t border-amber-900/10 pt-4">
        <label className="mb-1.5 block text-base font-medium text-amber-950">
          권한
        </label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="w-full rounded border border-amber-900/20 bg-white/50 px-3 py-2.5 text-base text-amber-950 focus:ring-2 focus:ring-amber-900/30 focus:outline-none sm:w-auto">
          <option value="USER">일반회원</option>
          <option value="ADMIN">관리자</option>
        </select>

        {saveError && (
          <p className="mt-2 text-sm text-red-600">{saveError.message}</p>
        )}

        <button
          type="button"
          disabled={role === member.role || isSaving}
          onClick={handleSave}
          className="mt-3 block w-full rounded bg-red-900 px-5 py-2.5 text-base font-medium text-white transition hover:bg-red-800 disabled:opacity-50 sm:w-auto">
          {isSaving ? '저장 중...' : '권한 저장'}
        </button>
      </div>
    </div>
  );
}

export default function AdminMembersPage() {
  const queryClient = useQueryClient();
  const [searchText, setSearchText] = useState('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);

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

      <div className="overflow-x-auto rounded-lg border border-amber-900/20 bg-white/40 shadow-sm backdrop-blur-sm">
        <table className="w-full text-left text-base">
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
            ) : visibleMembers.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-5 py-8 text-center text-amber-900/50">
                  회원이 없습니다.
                </td>
              </tr>
            ) : (
              visibleMembers.map((member) => (
                <tr key={member.id}>
                  <td className="px-5 py-3 text-amber-950">{member.userId}</td>
                  <td className="px-5 py-3 text-amber-950">{member.name}</td>
                  <td className="px-5 py-3 text-amber-800">{member.email}</td>
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
                      onClick={() => setSelectedMember(member)}
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

      {selectedMember && (
        <Modal title="회원 상세정보" onClose={() => setSelectedMember(null)}>
          <MemberDetailModal
            member={selectedMember}
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
