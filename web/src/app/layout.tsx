import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Image from 'next/image';

import "./globals.css";
import { Providers } from "./providers";
import { SiteHeader } from '@/components/SiteHeader';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Brick",
  description: "Programmable real estate ownership",
  icons: { icon: '/brick-logo.svg' },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <Providers>
          <a className="skip-link" href="#main">Skip to content</a>
          <SiteHeader />
          <main id="main" className="shell">{children}</main>
          <footer className="site-footer"><span className="footer-brand"><Image src="/brick-logo.svg" alt="" width={28} height={28} />Brick</span><p>A new way to share in real estate.</p><small>Demo experience. mBRL is fictional and has no real value.</small></footer>
        </Providers>
      </body>
    </html>
  );
}
