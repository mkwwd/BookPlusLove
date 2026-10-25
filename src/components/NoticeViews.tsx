'use client';

import { useEffect, useState } from 'react';

// Share only in-flight requests; the server cookie controls the 10-minute window.
const visits = new Map<number, Promise<number | undefined>>();

export default function NoticeViews({
  id,
  initialCount,
  published,
}: {
  id: number;
  initialCount: number;
  published: boolean;
}) {
  const [count, setCount] = useState(initialCount);
  useEffect(() => {
    if (!published) return;
    let active = true;
    const key = id;
    if (!visits.has(key)) {
      const visit = fetch(`/api/notices/${id}/view`, { method: 'POST' })
        .then(async (response) => {
          if (!response.ok) throw new Error('View request failed');
          const body = await response.json();
          return Number(body.viewCount);
        })
        .catch(() => undefined)
        .finally(() => {
          visits.delete(key);
        });
      visits.set(key, visit);
    }
    void visits.get(key)?.then((value) => {
      if (active && value !== undefined) setCount(value);
    });
    return () => {
      active = false;
    };
  }, [id, published]);
  return <span>조회수: {count.toLocaleString('ko-KR')}</span>;
}
