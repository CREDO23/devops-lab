import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Kivu Ferry',
  description: 'Ferry tickets on Lake Kivu',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en">
      <body className="bg-bg text-fg font-sans">{children}</body>
    </html>
  );
}
