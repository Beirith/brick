'use client';
import Link from 'next/link';
import { useBrick } from '@/hooks/useBrick';
import { propertyListings } from '@/lib/brick';
import { DataBoundary } from './DataBoundary';
import { EmptyState, PageHeading } from './ui';
import { PropertyCard } from './properties/PropertyCard';

export function Marketplace() {
  const { data } = useBrick();
  const available = data?.properties.filter(property => propertyListings(data, property).length);
  return <>
    <PageHeading eyebrow="REAL ESTATE, SHARED" title="Marketplace">Discover properties, start with a share, and build your own real estate portfolio.</PageHeading>
    <section><div className="section-heading"><div><span className="eyebrow">FIND YOUR FIRST SHARE</span><h2>Explore properties</h2></div><span className="muted">{available?.length ?? '—'} properties</span></div>
      <DataBoundary>{available?.length ? <div className="property-grid">{available.map(property => <PropertyCard key={property.id.toString()} property={property} listings={propertyListings(data!, property)} />)}</div> : <EmptyState title="More opportunities are on the way"><p>Properties appear here when their owners list shares for sale.</p><Link className="button button-secondary" href="/properties/new">Add a property</Link></EmptyState>}</DataBoundary>
    </section>
  </>;
}
