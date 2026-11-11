import type { Metadata } from 'next';
import localFont from 'next/font/local';
import type { ReactNode } from 'react';

import { I18nProvider } from '@/lib/i18n';

import './globals.css';
import { themeCss } from './theme-css';

// বাংলা + ল্যাটিন ফন্ট (মোবাইল অ্যাপের মতো Hind Siliguri, SIL OFL)
const hindSiliguri = localFont({
  src: [
    {
      path: '../../../node_modules/@expo-google-fonts/hind-siliguri/400Regular/HindSiliguri_400Regular.ttf',
      weight: '400',
    },
    {
      path: '../../../node_modules/@expo-google-fonts/hind-siliguri/600SemiBold/HindSiliguri_600SemiBold.ttf',
      weight: '600',
    },
    {
      path: '../../../node_modules/@expo-google-fonts/hind-siliguri/700Bold/HindSiliguri_700Bold.ttf',
      weight: '700',
    },
  ],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'SPARC Admin',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="bn" className={hindSiliguri.variable} suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{ __html: themeCss }} />
      </head>
      <body>
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
