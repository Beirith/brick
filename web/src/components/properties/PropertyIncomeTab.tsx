'use client';
import { useBrick } from '@/hooks/useBrick';
import { PropertyIncome } from './PropertyIncome';

export function PropertyIncomeTab({ id }: { id: string }) {
  const { data } = useBrick();
  const property = data?.properties.find(p => p.id.toString() === id);
  if (!data || !property) return null;
  return <PropertyIncome property={property} balance={data.balance} />;
}
