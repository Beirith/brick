import { notFound } from 'next/navigation';
import { PayRent } from '@/components/properties/PayRent';

type Search = Promise<{ amount?: string; reference?: string }>;

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Search }) {
  const { id } = await params;
  if (!/^\d+$/.test(id) || id.length > 78) notFound();
  const { amount, reference } = await searchParams;
  return <PayRent id={BigInt(id).toString()} initialAmount={amount?.slice(0, 32) || ''} initialReference={reference?.slice(0, 200) || ''} />;
}
