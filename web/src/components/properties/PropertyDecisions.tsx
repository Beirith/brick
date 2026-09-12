'use client';
import { useBrick } from '@/hooks/useBrick';
import { Governance } from './Governance';

export function PropertyDecisions({ id }: { id: string }) {
  const { data } = useBrick();
  const property = data?.properties.find(p => p.id.toString() === id);
  if (!property) return null;
  return <Governance property={property} />;
}
