import '@mantine/core/styles.css';
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { IBM_Plex_Sans_Hebrew } from 'next/font/google';
import { ColorSchemeScript, DirectionProvider, MantineProvider, mantineHtmlProps } from '@mantine/core';
import { Shell } from '@/components/Shell';
import { theme } from './theme';

const plex = IBM_Plex_Sans_Hebrew({ subsets: ['hebrew', 'latin'], weight: ['400', '500', '600', '700'], variable: '--font-plex' });

export const metadata: Metadata = { title: 'ניהול דירות', description: 'ניהול הדירות המשפחתיות: הכנסות, הוצאות והתחשבנות' };
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#1e6091' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={plex.variable} {...mantineHtmlProps}>
      <head><ColorSchemeScript defaultColorScheme="auto" /></head>
      <body>
        <DirectionProvider initialDirection="rtl">
          <MantineProvider defaultColorScheme="auto" theme={theme}>
            <Shell>{children}</Shell>
          </MantineProvider>
        </DirectionProvider>
      </body>
    </html>
  );
}
