import type { Metadata } from 'next';
import { Geist, JetBrains_Mono, Unbounded } from 'next/font/google';
import type { ReactNode } from 'react';
import { Providers } from '@/components/shell/providers';
import { TopBar } from '@/components/shell/top-bar';
import { SearchDialog } from '@/components/shell/search';
import { SiteFooter } from '@/components/shell/site-footer';
import './globals.css';
import './home.css';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });
const unbounded = Unbounded({ subsets: ['latin'], weight: ['600'], variable: '--font-unbounded', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'Anton Docs', template: '%s · Anton Docs' },
  description: 'Build cross-border payouts on Anton: guides, API reference and a sandbox console.',
  icons: { icon: '/brand/mark.svg' },
};

// Sets the theme before first paint: the reader's saved choice, else their system setting.
const themeScript = `(function(){var q=new URLSearchParams(location.search).get('theme');try{var t=q||JSON.parse(localStorage.getItem('anton-docs-theme'));}catch(e){}if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.dataset.theme=t;})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${mono.variable} ${unbounded.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Providers>
          <TopBar />
          {children}
          <SiteFooter />
          <SearchDialog />
        </Providers>
      </body>
    </html>
  );
}
