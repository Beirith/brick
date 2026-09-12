'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { useBrick } from '@/hooks/useBrick';
import { configuredIncomeAddress } from '@/config/contracts';
import { hskTestnet } from '@/config/wagmi';
import { amount, money } from '@/lib/format';
import { DataBoundary } from '../DataBoundary';
import { EmptyState, PageHeading } from '../ui';

export function PayRent({ id, initialAmount, initialReference }: { id: string; initialAmount: string; initialReference: string }) {
  const { data } = useBrick();
  const queryClient = useQueryClient();
  const property = data?.properties.find(p => p.id.toString() === id);
  const [value, setValue] = useState(initialAmount);
  const [reference, setReference] = useState(initialReference || 'Rent payment');
  const [status, setStatus] = useState<'idle' | 'busy' | 'error'>('idle');
  const [error, setError] = useState('');
  const [paid, setPaid] = useState<{ hash: string; amount: bigint }>();

  async function pay() {
    if (!property) return;
    setStatus('busy'); setError('');
    try {
      const payAmount = amount(value.trim());
      const response = await fetch('/api/pay-rent', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: property.token, amount: value.trim(), reference: reference.trim() }),
      });
      const result = await response.json() as { hash?: string; error?: string };
      if (!response.ok || !result.hash) throw new Error(result.error || 'The payment could not be completed.');
      setPaid({ hash: result.hash, amount: payAmount });
      await queryClient.invalidateQueries({ queryKey: ['income'] });
      await queryClient.invalidateQueries({ queryKey: ['brick'] });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The payment could not be completed.');
      setStatus('error');
      return;
    }
    setStatus('idle');
  }

  return <DataBoundary>{property ? <>
    <Link className="back-link" href={`/properties/${id}`}>← {property.name}</Link>
    <PageHeading eyebrow="RENT PAYMENT" title={`Pay rent for ${property.name}`}>This is a demo payment: no wallet or app is needed. Tap Pay rent and it is split among every shareholder automatically.</PageHeading>
    {!configuredIncomeAddress ? <div className="notice">Rent payments are not available yet for this property.</div> : paid ? <div className="panel">
      <h2>Payment complete</h2>
      <p>{money(paid.amount)} paid for {property.name}. It is now available for every shareholder to claim.</p>
      <a className="confirmation-link" href={`${hskTestnet.blockExplorers.default.url}/tx/${paid.hash}`} target="_blank" rel="noreferrer">View confirmation on HSK Testnet ↗</a>
      <div className="success-actions"><Link className="button" href={`/properties/${id}/income`}>View income for this property</Link><Link className="button button-secondary" href={`/properties/${id}`}>Back to property</Link></div>
    </div> : <div className="panel">
      <label>Amount (mBRL)<input value={value} onChange={e => setValue(e.target.value)} inputMode="decimal" placeholder="3500" disabled={status === 'busy'} /></label>
      <label>Reference<input value={reference} onChange={e => setReference(e.target.value)} maxLength={200} disabled={status === 'busy'} /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="full-width" disabled={status === 'busy' || !/^\d+(\.\d{1,6})?$/.test(value.trim()) || Number(value) <= 0} onClick={() => void pay()}>{status === 'busy' ? 'Processing payment…' : 'Pay rent'}</button>
      <small className="muted">Demo payment. No wallet connection or gas fee needed on your end.</small>
    </div>}
  </> : <EmptyState title="Property not found"><Link href="/marketplace">Back to marketplace</Link></EmptyState>}</DataBoundary>;
}
