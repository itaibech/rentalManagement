import '@mantine/core/styles.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { ColorSchemeScript, DirectionProvider, MantineProvider, mantineHtmlProps } from '@mantine/core';
import { Shell } from '@/components/Shell';

export const metadata: Metadata = { title: 'ניהול דירות' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="he" dir="rtl" {...mantineHtmlProps}>
      <head><ColorSchemeScript defaultColorScheme="auto" /></head>
      <body>
        <DirectionProvider initialDirection="rtl">
          <MantineProvider defaultColorScheme="auto" theme={{ primaryColor: 'teal' }}>
            <Shell>{children}</Shell>
          </MantineProvider>
        </DirectionProvider>
      </body>
    </html>
  );
}
