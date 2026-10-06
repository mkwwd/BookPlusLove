import { supabaseServer } from './server';

export async function withBookCoverCleanup(
  urls: unknown[],
  response: Response,
): Promise<Response> {
  const storage = supabaseServer.storage.from('book-covers');
  const {
    data: { publicUrl: baseUrl },
  } = storage.getPublicUrl('');
  const warnings: string[] = [];

  for (const url of new Set(urls)) {
    if (typeof url !== 'string' || !url.startsWith(baseUrl)) continue;
    const path = url.slice(baseUrl.length);
    // Only files created by our uploader, never arbitrary paths or external URLs.
    if (!/^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}\.[a-z\d]+$/.test(path))
      continue;

    try {
      // Keep query-string variants too; an uncertain lookup must never delete.
      const { data, error } = await supabaseServer
        .from('books')
        .select('id')
        .like('cover_url', `${url.replace(/[\\%_]/g, '\\$&')}%`)
        .limit(1);
      if (error || !data)
        throw new Error('표지 사용 여부를 확인하지 못했습니다.');
      if (data.length > 0) continue;
      const { error: removeError } = await storage.remove([path]);
      if (removeError) throw new Error('표지 파일을 삭제하지 못했습니다.');
    } catch {
      warnings.push(`미사용 표지 정리에 실패했습니다: ${path}`);
    }
  }

  if (warnings.length === 0) return response;
  const body = await response.json();
  return Response.json(
    { ...body, coverWarnings: [...(body.coverWarnings ?? []), ...warnings] },
    { status: response.status },
  );
}
