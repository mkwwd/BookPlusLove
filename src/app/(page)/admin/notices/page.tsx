import NoticeManager from '@/components/NoticeManager';

export default function AdminNoticesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-3xl text-amber-950">공지사항 관리</h2>
        <p className="mt-2 text-base text-amber-800">
          공개된 공지사항은 공지사항 페이지에 바로 표시됩니다.
        </p>
      </div>
      <NoticeManager />
    </div>
  );
}
