'use client';
import Link from 'next/link';
import { useConnection } from 'wagmi';
import { useBrick } from '@/hooks/useBrick';
import { propertyListings, reservedShares } from '@/lib/brick';
import { configuredAddresses, configuredIncomeAddress, marketAbi } from '@/config/contracts';
import { money, percentage } from '@/lib/format';
import { claimIncome, claimableIds, emptyIncome, useIncome } from '@/hooks/useIncome';
import { DataBoundary, WalletHint } from './DataBoundary';
import { EmptyState, PageHeading } from './ui';
import { useTransaction } from './Transactions';

export function Portfolio() {
  const { address } = useConnection();
  const { data } = useBrick();
  const { run, canSign } = useTransaction();
  const holdings = data?.properties.map(property => ({ ...property, reserved: reservedShares(propertyListings(data, property), address) })).filter(p => p.owned + p.reserved > 0n);
  const offers = data?.listings.filter(l => l.seller.toLowerCase() === address?.toLowerCase());
  const incomeQuery = useIncome(data?.properties);
  const claimableHoldings = (holdings || []).map(property => ({ property, income: incomeQuery.data?.get(property.token.toLowerCase()) || emptyIncome() })).filter(h => h.income.claimable > 0n);
  const totalClaimable = claimableHoldings.reduce((sum, h) => sum + h.income.claimable, 0n);
  return <>
    <PageHeading eyebrow="YOUR NEXT CHAPTER" title="My portfolio">Your properties, ownership and rental income in one place.</PageHeading>
    {!address ? <EmptyState title="Your portfolio starts here"><p>Connect your wallet using the button above to see your holdings.</p></EmptyState> : <DataBoundary>
      <p className="notice">mBRL is a fictional currency used exclusively for demonstration and has no real value. Only free test HSK is used for network fees. Never send real funds.</p><WalletHint />
      {configuredIncomeAddress && claimableHoldings.length > 0 && <section className="section-space"><div className="panel income-highlight income-claim-all">
        <div><span className="eyebrow">ACROSS YOUR PROPERTIES</span><h2>Income to claim</h2><p className="large-value">{money(totalClaimable)}</p></div>
        <div className="income-claim-list">{claimableHoldings.map(({ property, income }) => <div className="income-claim-row" key={property.id.toString()}>
          <span>{property.name}</span><span>{money(income.claimable)}</span>
          <button className="button-secondary" disabled={!canSign} onClick={() => void run(async send => { const claimed = income.claimable; await claimIncome(send, claimableIds(income)); return `${money(claimed)} added to your demo balance.`; })}>Claim</button>
        </div>)}</div>
      </div></section>}
      <section className="section-space"><div className="section-heading"><div><span className="eyebrow">REAL ESTATE HOLDINGS</span><h2>My properties</h2></div><span className="muted">{holdings?.length || 0} properties</span></div>{holdings?.length ? <div className="holdings-grid">{holdings.map(property => {
        const owned = property.owned + property.reserved;
        const income = incomeQuery.data?.get(property.token.toLowerCase()) || emptyIncome();
        const tokenValue = property.supply ? property.value * owned / property.supply : 0n;
        return <Link className="holding-card panel" href={`/properties/${property.id}`} key={property.id.toString()}><div className="holding-card-top"><span className="badge">{percentage(owned, property.supply)} ownership</span><span aria-hidden="true">↗</span></div><h3>{property.name}</h3>{property.location && <p className="muted">{property.location}</p>}<p className="holding-value">{money(tokenValue)}</p><span className="muted">Estimated value of your shares</span><dl className="summary-lines"><div><dt>Shares owned</dt><dd>{owned.toString()}</dd></div><div><dt>Available</dt><dd>{property.owned.toString()}</dd></div><div><dt>Listed for sale</dt><dd>{property.reserved.toString()}</dd></div><div><dt>Rental income generated</dt><dd>{configuredIncomeAddress ? money(income.generated) : '—'}</dd></div><div><dt>Your income available</dt><dd className="accent">{configuredIncomeAddress ? money(income.claimable) : '—'}</dd></div></dl><span className="card-link">View property details →</span></Link>;
      })}</div> : <EmptyState title="Your first share is waiting"><p>Explore available properties to begin your portfolio.</p><Link className="button" href="/marketplace">Explore properties</Link></EmptyState>}</section>
      <section className="section-space"><h2>My active offers</h2>{offers?.length ? <div className="offer-grid">{offers.map(offer => {
        const property = data!.properties.find(p => p.token.toLowerCase() === offer.token.toLowerCase());
        return <article className="panel" key={offer.id.toString()}><h3>{property?.name || 'Property'}</h3><dl className="summary-lines"><div><dt>Shares remaining</dt><dd>{offer.remaining.toString()}</dd></div><div><dt>Price per share</dt><dd>{money(offer.price)}</dd></div><div><dt>Remaining offer value</dt><dd>{money(offer.remaining * offer.price)}</dd></div></dl><button className="button-secondary" disabled={!canSign} onClick={() => run(async send => { await send(configuredAddresses!.marketplace, marketAbi, 'cancelListing', [offer.id], 'Canceling offer'); return 'Offer canceled. Unsold shares are available in your portfolio again.'; })}>Cancel offer</button></article>;
      })}</div> : <EmptyState title="No active offers"><p>When you list shares for sale, you can manage them here.</p></EmptyState>}</section>
    </DataBoundary>}
  </>;
}
