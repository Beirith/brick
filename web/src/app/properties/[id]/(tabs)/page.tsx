import { notFound } from 'next/navigation';
import { PropertyOverview } from '@/components/properties/PropertyOverview';
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id) || id.length > 78) notFound();
  return <PropertyOverview id={BigInt(id).toString()} />;
}
