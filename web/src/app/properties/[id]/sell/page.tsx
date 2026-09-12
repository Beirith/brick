import { notFound } from 'next/navigation';
import { SellShares } from '@/components/properties/SellShares';
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id) || id.length > 78) notFound();
  return <SellShares id={BigInt(id).toString()} />;
}
