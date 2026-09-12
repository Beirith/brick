import Link from 'next/link';
import { type Property, type Listing } from '@/lib/brick';
import { money } from '@/lib/format';
import { PropertyArtwork } from '../ui';

export function PropertyCard({ property, listings }: { property: Property; listings: Listing[] }) {
  const available = listings.reduce((sum, listing) => sum + listing.remaining, 0n);
  const minimum = listings.reduce((min, listing) => listing.price < min ? listing.price : min, listings[0].price);
  return <article className="property-card">
    <PropertyArtwork name={property.name} />
    <div className="card-body">
      <span className="badge">{available.toLocaleString('en-US')} shares available</span>
      <h2>{property.name}</h2>{property.location && <p className="muted">{property.location}</p>}
      <dl className="card-stats"><div><dt>Property value</dt><dd>{money(property.value)}</dd></div><div><dt>Shares from</dt><dd className="accent">{money(minimum)}</dd></div></dl>
      <Link className="button button-secondary full-width" href={`/properties/${property.id}`}>View property <span aria-hidden="true">↗</span></Link>
    </div>
  </article>;
}
