import { createRouteClient } from '@/utils/supabase/route';
import { supabaseServer } from '@/utils/supabase/server';

const MAX_SIZE = 5 * 1024 * 1024;

export async function POST(request: Request) {
  const supabase = await createRouteClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return Response.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const { data: profile } = await supabaseServer
    .from('users')
    .select('role')
    .ilike('email', user.email)
    .maybeSingle();

  if (profile?.role !== 'ADMIN') {
    return Response.json(
      { error: '관리자만 업로드할 수 있습니다.' },
      { status: 403 },
    );
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get('file');

  if (!(file instanceof File)) {
    return Response.json({ error: '파일이 없습니다.' }, { status: 400 });
  }
  if (!file.type.startsWith('image/')) {
    return Response.json(
      { error: '이미지 파일만 업로드할 수 있습니다.' },
      { status: 400 },
    );
  }
  if (file.size > MAX_SIZE) {
    return Response.json(
      { error: '파일 크기는 5MB 이하여야 합니다.' },
      { status: 400 },
    );
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabaseServer.storage
    .from('book-covers')
    .upload(path, file, { contentType: file.type });

  if (uploadError) {
    return Response.json(
      { error: `업로드에 실패했습니다: ${uploadError.message}` },
      { status: 500 },
    );
  }

  const {
    data: { publicUrl },
  } = supabaseServer.storage.from('book-covers').getPublicUrl(path);

  return Response.json({ url: publicUrl });
}
