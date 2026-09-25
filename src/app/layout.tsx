import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'JN Staff Leave Portal — Jaynepal Action Volunteers',
  description: 'Enterprise staff leave management and approval system for Jaynepal Action Volunteers',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full bg-slate-50">
      <body className="h-full text-slate-900 antialiased flex flex-col">{children}</body>
    </html>
  );
}
