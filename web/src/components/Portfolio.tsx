'use client';
import Link from 'next/link';
import { useConnection } from 'wagmi';
import { useBrick } from '@/hooks/useBrick';
import { propertyListings, reservedShares } from '@/lib/brick';
import { configuredAddresses, marketAbi, tokenAbi } from '@/config/contracts';
import { money, percentage } from '@/lib/format';
import { DataBoundary, WalletHint } from './DataBoundary';
import { EmptyState, PageHeading } from './ui';
import { useTransaction } from './Transactions';

export function Portfolio() {
  const { address } = useConnection();
  const { data } = useBrick();
  const { run, canSign } = useTransaction();
  const holdings = data?.properties.map(property => ({ ...property, reserved: reservedShares(propertyListings(data, property), address) })).filter(p => p.owned + p.reserved > 0n);
  const offers = data?.listings.filter(l => l.seller.toLowerCase() === address?.toLowerCase());
  return <>
    <PageHeading eyebrow="YOUR NEXT CHAPTER" title="My portfolio">Your balance, your properties, and your offers. All in one place.</PageHeading>
    {!address ? <EmptyState title="Your portfolio starts here"><p>Connect your wallet using the button above to see your holdings.</p></EmptyState> : <DataBoundary>
      <section className="balance-panel"><div><span className="eyebrow">DEMO BALANCE</span><h2>{data ? money(data.balance) : '—'}</h2><p className="wallet-address">{address}</p></div><button disabled={!canSign} onClick={() => run(async send => { await send(configuredAddresses!.currency, tokenAbi, 'mint', [address, 500_000n * 10n ** 6n], 'Adding demo funds'); return '500,000 demo mBRL added to your balance.'; })}>Add demo funds</button></section>
      <p className="notice">mBRL is a fictional currency used exclusively for demonstration and has no real value. Only free test HSK is used for network fees. Never send real funds.</p><WalletHint />
      <section className="section-space"><h2>My holdings</h2>{holdings?.length ? <div className="holdings-grid">{holdings.map(property => <article className="panel" key={property.id.toString()}><span className="badge">{percentage(property.owned + property.reserved, property.supply)} ownership</span><h3>{property.name}</h3><dl className="summary-lines"><div><dt>Total property value</dt><dd>{money(property.value)}</dd></div><div><dt>Total owned</dt><dd>{(property.owned + property.reserved).toString()} shares</dd></div><div><dt>Available</dt><dd>{property.owned.toString()}</dd></div><div><dt>Listed for sale</dt><dd>{property.reserved.toString()}</dd></div></dl><div className="row"><Link className="button button-secondary" href={`/properties/${property.id}`}>View property</Link>{property.owned > 0n && <Link className="button" href={`/properties/${property.id}/sell`}>Sell shares</Link>}</div></article>)}</div> : <EmptyState title="Your first share is waiting"><p>Explore available properties to begin your portfolio.</p><Link className="button" href="/">Explore properties</Link></EmptyState>}</section>
      <section className="section-space"><h2>My active offers</h2>{offers?.length ? <div className="offer-grid">{offers.map(offer => {
        const property = data!.properties.find(p => p.token.toLowerCase() === offer.token.toLowerCase());
        return <article className="panel" key={offer.id.toString()}><h3>{property?.name || 'Property'}</h3><dl className="summary-lines"><div><dt>Shares remaining</dt><dd>{offer.remaining.toString()}</dd></div><div><dt>Price per share</dt><dd>{money(offer.price)}</dd></div><div><dt>Remaining offer value</dt><dd>{money(offer.remaining * offer.price)}</dd></div></dl><button className="button-secondary" disabled={!canSign} onClick={() => run(async send => { await send(configuredAddresses!.marketplace, marketAbi, 'cancelListing', [offer.id], 'Canceling offer'); return 'Offer canceled. Unsold shares are available in your portfolio again.'; })}>Cancel offer</button></article>;
      })}</div> : <EmptyState title="No active offers"><p>When you list shares for sale, you can manage them here.</p></EmptyState>}</section>
    </DataBoundary>}
  </>;
}
