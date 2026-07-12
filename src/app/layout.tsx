import type { Metadata } from 'next';

import './globals.css';
import QueryProvider from '@/providers/QueryProvider';

export const metadata: Metadata = {
  title: 'bookpluslove',
  description: '',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`h-full`}>
      <body className="flex min-h-full flex-col">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
