import type { ReactNode } from 'react';

export function PageHeading({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return <div className="page-heading">{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h1>{title}</h1>{children && <p>{children}</p>}</div>;
}
export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return <div className="empty-state"><span className="empty-icon" aria-hidden="true">▦</span><h2>{title}</h2>{children}</div>;
}
export function Stat({ label, children }: { label: string; children: ReactNode }) {
  return <div className="stat"><dt>{label}</dt><dd>{children}</dd></div>;
}
export function PropertyArtwork({ name }: { name: string }) {
  return <div className="property-art" aria-label={`Illustration for ${name}`} role="img"><div className="building building-back" /><div className="building building-front"><i /><i /><i /><i /><i /><i /></div><span className="art-label">BRICK COLLECTION</span></div>;
}
