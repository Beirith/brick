'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useBrick } from '@/hooks/useBrick';
import { configuredAddresses, tokenAbi, marketAbi } from '@/config/contracts';
import { amount, integer, money, percentage, percentageToShares, totalPrice } from '@/lib/format';
import { DataBoundary, WalletHint } from '../DataBoundary';
import { EmptyState, PageHeading } from '../ui';
import { useTransaction } from '../Transactions';

export function SellShares({ id }: { id: string }) {
  const { data } = useBrick();
  const property = data?.properties.find(p => p.id.toString() === id);
  const [quantity, setQuantity] = useState('1');
  const [mode, setMode] = useState<'shares' | 'percentage'>('shares');
  const [percentageInput, setPercentageInput] = useState('10');
  const [price, setPrice] = useState('');
  const { run, canSign, busy } = useTransaction();
  const router = useRouter();
  const ownedShares = property?.owned ?? 0n;
  let saleQuantity: bigint | undefined;
  let quantityError = '';
  try {
    if (mode === 'shares') saleQuantity = integer(quantity);
    else saleQuantity = percentageToShares(percentageInput, ownedShares);
    if (saleQuantity > ownedShares) throw new Error('Quantity exceeds your available shares.');
  } catch (cause) {
    saleQuantity = undefined;
    if ((mode === 'shares' ? quantity : percentageInput) && ownedShares > 0n) {
      quantityError = cause instanceof Error ? cause.message : 'Enter a valid quantity.';
    }
  }
  let total: bigint | undefined;
  try { if (saleQuantity !== undefined) total = totalPrice(saleQuantity, amount(price)); } catch { /* Incomplete input. */ }
  return <DataBoundary>{property ? <>
    <Link className="back-link" href={`/properties/${id}`}>← {property.name}</Link>
    <PageHeading eyebrow="MAKE ROOM FOR NEW OWNERS" title="Sell your shares">Set a price and invite someone else to own a piece of {property.name}.</PageHeading>
    <div className="form-layout"><form className="panel" onSubmit={event => {
      event.preventDefault();
      void run(async send => {
        const count = mode === 'percentage' ? percentageToShares(percentageInput, property.owned) : integer(quantity);
        const unit = amount(price);
        totalPrice(count, unit);
        if (count > property.owned) throw new Error('Quantity exceeds your available shares.');
        await send(property.token, tokenAbi, 'approve', [configuredAddresses!.marketplace, count], '1/2 Authorizing shares');
        await send(configuredAddresses!.marketplace, marketAbi, 'createListing', [property.token, count, unit], '2/2 Publishing offer');
        router.push(`/properties/${id}`);
        return 'Your offer is live. You can manage it in My portfolio.';
      });
    }}><span className="badge">{property.owned.toLocaleString('en-US')} shares available to sell</span>
      <div className="choice-tabs" role="group" aria-label="How much to sell"><button type="button" aria-pressed={mode === 'shares'} className={mode === 'shares' ? 'choice-active' : 'button-secondary'} onClick={() => setMode('shares')} disabled={busy}>By shares</button><button type="button" aria-pressed={mode === 'percentage'} className={mode === 'percentage' ? 'choice-active' : 'button-secondary'} onClick={() => setMode('percentage')} disabled={busy}>By percentage</button></div>
      {mode === 'shares' ? <label>Shares to sell<input type="number" min="1" step="1" max={property.owned.toString()} value={quantity} onChange={e => setQuantity(e.target.value)} required disabled={busy} /></label> : <label>Percentage to sell (%)<input type="text" inputMode="decimal" minLength={1} value={percentageInput} onChange={e => setPercentageInput(e.target.value)} required disabled={busy} aria-invalid={!!quantityError} aria-describedby="percentage-help" /><small id="percentage-help">Percentage of your {ownedShares.toLocaleString('en-US')} available shares. Enter 49 to sell 49% of them.</small></label>}
      {quantityError && <p className="notice" role="alert">{quantityError}</p>}
      {mode === 'percentage' && saleQuantity !== undefined && <div className="notice" aria-live="polite">
        <strong>{percentageInput.replace(',', '.')}% of {ownedShares.toLocaleString('en-US')} shares = {saleQuantity.toLocaleString('en-US')} shares for sale</strong>
        <p>After all these shares are sold, you will keep {percentage(ownedShares - saleQuantity, ownedShares)} of your currently available shares ({(ownedShares - saleQuantity).toLocaleString('en-US')} shares).</p>
        <small>Fractional results are rounded down to whole shares. To sell a specific number of shares instead, choose “By shares”.</small>
      </div>}
      <label>Price per share (mBRL)<input inputMode="decimal" value={price} placeholder="5000" onChange={e => setPrice(e.target.value)} required disabled={busy} /><small>Use a decimal point, without commas.</small></label>
      <WalletHint />{property.owned === 0n && <p className="notice">You have no available shares to sell. Listed shares can be managed in My portfolio.</p>}
      <button className="full-width" disabled={!canSign || property.owned === 0n || total === undefined}>Publish offer</button>
    </form><aside className="panel summary-panel"><span className="eyebrow">YOUR OFFER</span><h2>Total offer value</h2><p className="large-value">{total === undefined ? '—' : money(total)}</p><p className="muted">Your shares will be reserved for sale. You can cancel any unsold shares from My portfolio.</p><hr /><p className="muted">MetaMask will ask for two confirmations: authorizing your shares, then publishing your offer.</p></aside></div>
  </> : <EmptyState title="Property not found"><Link href="/marketplace">Back to marketplace</Link></EmptyState>}</DataBoundary>;
}
