'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { configuredIncomeAddress } from '@/config/contracts';
import { useBrick } from '@/hooks/useBrick';
import { DataBoundary } from '../DataBoundary';
import { EmptyState, PageHeading } from '../ui';

export function PropertyTabsHeader({ id, children }: { id: string; children: ReactNode }) {
  const { data } = useBrick();
  const pathname = usePathname();
  const property = data?.properties.find(p => p.id.toString() === id);
  const base = `/properties/${id}`;
  const tabs: [string, string][] = [[base, 'Overview'], [`${base}/decisions`, 'Decisions']];
  if (configuredIncomeAddress) tabs.push([`${base}/income`, 'Income']);
  return <DataBoundary>{property ? <>
    <Link className="back-link" href="/marketplace">← Marketplace</Link>
    <PageHeading eyebrow={property.location || 'PROPERTY OVERVIEW'} title={property.name}>A closer look at your next share.</PageHeading>
    <nav className="tab-nav" aria-label="Property sections">{tabs.map(([href, label]) => <Link key={href} href={href} aria-current={pathname === href ? 'page' : undefined}>{label}</Link>)}</nav>
    {children}
  </> : <EmptyState title="Property not found"><Link href="/marketplace">Back to marketplace</Link></EmptyState>}</DataBoundary>;
}
