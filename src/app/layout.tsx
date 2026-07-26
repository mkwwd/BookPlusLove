import type { Metadata } from 'next';

import Header from '@/components/Header';
import './globals.css';
import QueryProvider from '@/providers/QueryProvider';

export const metadata: Metadata = {
  title: '책더하기사랑도서관',
  description: '광주가톨릭평생교육원 책더하기사랑도서관',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`h-full`}>
      <body className="flex min-h-full flex-col">
        <QueryProvider>
          <Header />
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
