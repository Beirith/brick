import { notFound } from 'next/navigation';
import { PropertyDetails } from '@/components/properties/PropertyDetails';
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id) || id.length > 78) notFound();
  return <PropertyDetails id={BigInt(id).toString()} />;
}
