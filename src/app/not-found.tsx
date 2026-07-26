import BookTearIllustration from '../components/BookTearIllustration';

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fbfaf7] px-6">
      <div className="flex w-full max-w-6xl flex-col items-center gap-12 lg:flex-row lg:justify-between">
        <div className="w-full max-w-[620px]">
          <BookTearIllustration />
        </div>

        <section className="shrink-0 text-center lg:text-left">
          <p className="tracking-[0.35em] text-[#77716d]">PAGE NOT FOUND</p>

          <h1 className="text-[120px] leading-none font-bold text-[#e1ddd7]">
            404
          </h1>

          <h2 className="mt-5 text-4xl font-bold text-[#292727]">
            존재하지 않는 페이지입니다
          </h2>

          <p className="mt-6 leading-8 text-[#77716d]">
            주소가 변경되었거나 삭제된 페이지일 수 있습니다.
            <br />
            입력한 주소를 다시 확인해 주세요.
          </p>
        </section>
      </div>
    </main>
  );
}
