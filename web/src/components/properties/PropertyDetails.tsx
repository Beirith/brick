'use client';
import Link from 'next/link';
import { useConnection } from 'wagmi';
import { useBrick } from '@/hooks/useBrick';
import { propertyListings, reservedShares } from '@/lib/brick';
import { money, percentage, referencePrice } from '@/lib/format';
import { DataBoundary, WalletHint } from '../DataBoundary';
import { EmptyState, PageHeading, PropertyArtwork, Stat } from '../ui';
import { BuyShares } from './BuyShares';

export function PropertyDetails({ id }: { id: string }) {
  const { data } = useBrick();
  const { address } = useConnection();
  const property = data?.properties.find(p => p.id.toString() === id);
  const listings = property && data ? propertyListings(data, property) : [];
  const reserved = reservedShares(listings, address);
  return <DataBoundary>{property ? <>
    <Link className="back-link" href="/">← Marketplace</Link>
    <PageHeading eyebrow={property.location || 'PROPERTY OVERVIEW'} title={property.name}>A closer look at your next share.</PageHeading>
    <div className="detail-layout"><PropertyArtwork name={property.name} /><section className="panel"><h2>At a glance</h2><dl className="stats-grid">
      <Stat label="Property value">{money(property.value)}</Stat><Stat label="Total shares">{property.supply.toString()}</Stat>
      <Stat label="Reference value per share">{referencePrice(property.value, property.supply)}</Stat><Stat label="Shares for sale">{listings.reduce((sum, l) => sum + l.remaining, 0n).toString()}</Stat>
      <Stat label="Your available shares">{property.owned.toString()}</Stat><Stat label="Your approximate ownership">{percentage(property.owned + reserved, property.supply)}</Stat>
    </dl>{reserved > 0n && <p className="muted">You also own {reserved.toString()} shares currently listed for sale. They are included in your ownership percentage.</p>}
    {property.owned > 0n && <Link className="button full-width" href={`/properties/${id}/sell`}>Sell shares</Link>}</section></div>
    <section className="section-space"><h2>Available offers</h2><p className="muted">Each owner sets their sale price. Choose an offer and the number of shares you want.</p><WalletHint />
      {listings.length ? <div className="offer-grid">{listings.map(listing => <BuyShares key={listing.id.toString()} listing={listing} balance={data!.balance} propertyId={id} />)}</div> : <EmptyState title="No shares for sale yet"><p>Check back later, or list your own shares.</p></EmptyState>}
    </section>
  </> : <EmptyState title="Property not found"><Link href="/">Back to marketplace</Link></EmptyState>}</DataBoundary>;
}
