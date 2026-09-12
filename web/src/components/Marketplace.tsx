'use client';
import Link from 'next/link';
import { useBrick } from '@/hooks/useBrick';
import { propertyListings } from '@/lib/brick';
import { DataBoundary } from './DataBoundary';
import { EmptyState } from './ui';
import { PropertyCard } from './properties/PropertyCard';

export function Marketplace() {
  const { data } = useBrick();
  const available = data?.properties.filter(property => propertyListings(data, property).length);
  return <>
    <section className="hero"><div><span className="eyebrow">REAL ESTATE, SHARED</span><h1>A place in the market.<br /><span>For more of us.</span></h1><p>Discover properties, start with a share, and build your own real estate portfolio.</p><Link className="button" href="#properties">Explore properties ↓</Link></div><div className="hero-art" aria-hidden="true"><div className="hero-block one"/><div className="hero-block two"/><div className="hero-block three"/><span>Build your portfolio.<br />One brick at a time.</span></div></section>
    <section id="properties"><div className="section-heading"><div><span className="eyebrow">FIND YOUR FIRST SHARE</span><h2>Explore properties</h2></div><span className="muted">{available?.length ?? '—'} properties</span></div>
      <DataBoundary>{available?.length ? <div className="property-grid">{available.map(property => <PropertyCard key={property.id.toString()} property={property} listings={propertyListings(data!, property)} />)}</div> : <EmptyState title="More opportunities are on the way"><p>Properties appear here when their owners list shares for sale.</p><Link className="button button-secondary" href="/properties/new">Add a property</Link></EmptyState>}</DataBoundary>
    </section>
  </>;
}
