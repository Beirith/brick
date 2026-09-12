'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { parseEventLogs } from 'viem';
import { configuredAddresses, factoryAbi } from '@/config/contracts';
import { formatPropertyValue, integer, propertyValueAmount, referencePrice } from '@/lib/format';
import { useTransaction } from '../Transactions';
import { DataBoundary, WalletHint } from '../DataBoundary';
import { PageHeading } from '../ui';

export function NewProperty() {
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [shares, setShares] = useState('');
  const router = useRouter();
  const { run, canSign, busy } = useTransaction();
  let estimate = '—';
  try { estimate = referencePrice(propertyValueAmount(value), integer(shares)); } catch { /* Incomplete input. */ }
  return <>
    <PageHeading eyebrow="START SOMETHING SHARED" title="Add your property">Turn a property into shares. Choose its value and how many shares to create.</PageHeading>
    <DataBoundary><div className="form-layout"><form className="panel" onSubmit={event => {
      event.preventDefault();
      void run(async send => {
        if (!name.trim()) throw new Error('Enter a property name.');
        const price = propertyValueAmount(value), count = integer(shares);
        const receipt = await send(configuredAddresses!.factory, factoryAbi, 'createProperty', [name.trim(), 'BRICK', count, price, ''], 'Tokenizing property');
        const events = parseEventLogs({ abi: factoryAbi, eventName: 'PropertyCreated', logs: receipt.logs.filter(log => log.address.toLowerCase() === configuredAddresses!.factory.toLowerCase()) });
        const id = events[0]?.args.propertyId;
        if (id === undefined) throw new Error('Property created. Open My portfolio to find it.');
        router.push(`/properties/${id}`);
        return 'Your property is ready. You can now list shares for sale.';
      });
    }}>
      <h2>Property information</h2>
      <label>Property name<input value={name} onChange={e => setName(e.target.value)} maxLength={120} placeholder="e.g. Floripa Apartment" required disabled={busy} /></label>
      <label>Property value (mBRL)<input value={value} onChange={e => setValue(formatPropertyValue(e.target.value))} inputMode="numeric" placeholder="500.000" required disabled={busy} /><small>Use dots to group thousands, for example 500.000.</small></label>
      <label>Total shares<input value={shares} onChange={e => setShares(e.target.value)} inputMode="numeric" pattern="[0-9]+" placeholder="100" required disabled={busy} /><small>Shares are whole units. You will initially own all of them.</small></label>
      <WalletHint /><button className="full-width" disabled={!canSign}>Tokenize property</button>
    </form><aside className="panel summary-panel"><span className="eyebrow">YOUR PROPERTY, IN SHARES</span><h2>Estimated value per share</h2><p className="large-value">{estimate}</p><p className="muted">Property value ÷ total shares. You can choose a different sale price when you list your shares.</p><hr /><p className="muted">This is a demonstration. Creating shares here does not establish legal ownership of real estate.</p></aside></div></DataBoundary>
  </>;
}
