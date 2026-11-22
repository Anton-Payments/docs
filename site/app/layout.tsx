import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/site';
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
  metadataBase: new URL(SITE_URL),
  title: { default: 'Anton Docs', template: '%s · Anton Docs' },
  description: 'Developer docs for Anton: cross-border payouts, and the intelligence that checks each one before it moves.',
  icons: { icon: '/brand/mark.svg' },
  openGraph: { siteName: 'Anton Docs', type: 'website' },
  twitter: { card: 'summary_large_image' },
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
        <a className="skip" href="#content">Skip to content</a>
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
