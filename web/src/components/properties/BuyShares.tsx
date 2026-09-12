'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useConnection } from 'wagmi';
import type { Listing } from '@/lib/brick';
import { integer, money, shortAddress, totalPrice } from '@/lib/format';
import { configuredAddresses, tokenAbi, marketAbi } from '@/config/contracts';
import { useTransaction } from '../Transactions';

export function BuyShares({ listing, balance, propertyId }: { listing: Listing; balance: bigint; propertyId: string }) {
  const [quantity, setQuantity] = useState('1');
  const router = useRouter();
  const { address } = useConnection();
  const { run, canSign, busy } = useTransaction();
  let total: bigint | undefined;
  try { const count = integer(quantity); if (count <= listing.remaining) total = totalPrice(count, listing.price); } catch { /* Incomplete input. */ }
  const own = address?.toLowerCase() === listing.seller.toLowerCase();
  return <form className="panel offer" onSubmit={event => {
    event.preventDefault();
    void run(async send => {
      const count = integer(quantity);
      if (count > listing.remaining) throw new Error('Quantity exceeds available shares.');
      const payment = totalPrice(count, listing.price);
      if (payment > balance) throw new Error('Insufficient demo balance. Add demo funds in My portfolio.');
      await send(configuredAddresses!.currency, tokenAbi, 'approve', [configuredAddresses!.marketplace, payment], '1/2 Authorizing payment');
      const receipt = await send(configuredAddresses!.marketplace, marketAbi, 'buyShares', [listing.id, count], '2/2 Buying shares');
      const summary = new URLSearchParams({
        shares: count.toString(),
        price: listing.price.toString(),
        total: payment.toString(),
        confirmation: receipt.transactionHash,
      });
      router.push(`/properties/${propertyId}/purchase/success?${summary.toString()}`);
      return 'Purchase complete. Your shares are now in My portfolio.';
    });
  }}>
    <div className="section-heading"><h3>{own ? 'Your offer' : `Offer by ${shortAddress(listing.seller)}`}</h3><span className="badge">{listing.remaining.toString()} available</span></div>
    <dl className="summary-lines"><div><dt>Price per share</dt><dd>{money(listing.price)}</dd></div></dl>
    {own ? <p><Link href="/portfolio">Manage this offer in My portfolio →</Link></p> : <>
      <label>Quantity<input type="number" min="1" step="1" max={listing.remaining.toString()} value={quantity} onChange={e => setQuantity(e.target.value)} required disabled={busy} /></label>
      <dl className="summary-lines total"><div><dt>Total</dt><dd>{total === undefined ? '—' : money(total)}</dd></div></dl>
      {address && total !== undefined && total > balance && <p className="notice">Need more demo funds? <Link href="/portfolio">Add them in My portfolio.</Link></p>}
      <button className="full-width" disabled={!canSign || total === undefined || total > balance}>Buy shares</button>
      <small className="muted">Your wallet will ask you to confirm two steps.</small>
    </>}
  </form>;
}
