import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '책더하기사랑도서관',
    short_name: '책더하기사랑도서관',
    description: '광주가톨릭평생교육원 책더하기사랑도서관',
    start_url: '/',
    display: 'standalone',
    background_color: '#fbfaf7',
    theme_color: '#7f1d1d',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
