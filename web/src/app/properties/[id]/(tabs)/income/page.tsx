import { notFound } from 'next/navigation';
import { PropertyIncomeTab } from '@/components/properties/PropertyIncomeTab';
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id) || id.length > 78) notFound();
  return <PropertyIncomeTab id={BigInt(id).toString()} />;
}
