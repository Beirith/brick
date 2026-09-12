import { notFound } from 'next/navigation';
import { PropertyTabsHeader } from '@/components/properties/PropertyTabsHeader';

export default async function Layout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id) || id.length > 78) notFound();
  return <PropertyTabsHeader id={BigInt(id).toString()}>{children}</PropertyTabsHeader>;
}
