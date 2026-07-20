import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '책더하기사랑 도서관',
    short_name: '책더하기사랑',
    description: '광주가톨릭평생교육원 책더하기사랑 도서관',
    start_url: '/',
    display: 'standalone',
    background_color: '#fffbeb',
    theme_color: '#78350f',
    icons: [
      {
        src: '/image/logo.png',
        sizes: '360x397',
        type: 'image/png',
      },
    ],
  };
}
