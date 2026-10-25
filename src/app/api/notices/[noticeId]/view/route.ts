import { NextRequest, NextResponse } from 'next/server';

import { supabaseServer } from '@/utils/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ noticeId: string }> },
) {
  const { noticeId } = await params;
  if (!/^[1-9]\d*$/.test(noticeId))
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
  const origin = request.headers.get('origin');
  if (origin && origin !== request.nextUrl.origin)
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 403 });
  const counted = request.cookies.get('notice-view')?.value === '1';
  const { data, error } = counted
    ? await supabaseServer
        .from('notices')
        .select('view_count')
        .eq('id', noticeId)
        .eq('is_published', true)
        .maybeSingle()
    : await supabaseServer.rpc('increment_notice_view', {
        p_notice_id: noticeId,
      });
  if (error)
    return NextResponse.json(
      { error: '조회수를 집계하지 못했습니다.' },
      { status: 500 },
    );
  if (data === null)
    return NextResponse.json(
      { error: '공지사항을 찾을 수 없습니다.' },
      { status: 404 },
    );
  const response = NextResponse.json({
    viewCount: Number(counted ? data.view_count : data),
  });
  response.headers.set('Cache-Control', 'no-store');
  if (!counted)
    response.cookies.set('notice-view', '1', {
      httpOnly: true,
      sameSite: 'lax',
      secure: request.nextUrl.protocol === 'https:',
      path: `/api/notices/${noticeId}/view`,
      maxAge: 60 * 10,
    });
  return response;
}
