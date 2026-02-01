import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { Footer } from '@/components/ui/Footer';
import { Header } from '@/components/ui/Header';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'ARI - Australian Real Estate Agents Index',
    template: '%s | ARI'
  },
  description: 'Find real estate agents in Australia. Browse agents by suburb and state.'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen flex-col">
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
