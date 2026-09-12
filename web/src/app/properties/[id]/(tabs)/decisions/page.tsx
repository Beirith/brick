import { notFound } from 'next/navigation';
import { PropertyDecisions } from '@/components/properties/PropertyDecisions';
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id) || id.length > 78) notFound();
  return <PropertyDecisions id={BigInt(id).toString()} />;
}
