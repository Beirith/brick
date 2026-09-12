'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { ConnectWallet } from './ConnectWallet';

export function SiteHeader() {
  const path = usePathname();
  return <header className="site-header"><div className="header-inner">
    <Link href="/" className="brand" aria-label="Brick home">
      <Image src="/brick-logo.svg" alt="" width={48} height={48} priority />
      <span>brick</span>
    </Link>
    <nav aria-label="Main navigation">
      {[['/', 'Home'], ['/marketplace', 'Marketplace'], ['/properties/new', 'Add property'], ['/portfolio', 'My portfolio']].map(([href, label]) => <Link key={href} href={href} aria-current={path === href ? 'page' : undefined}>{label}</Link>)}
    </nav>
    <ConnectWallet />
  </div></header>;
}
