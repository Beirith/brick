import Link from 'next/link';
import { notFound } from 'next/navigation';
import { hskTestnet } from '@/config/wagmi';
import { money, shortAddress } from '@/lib/format';
import { PageHeading, Stat } from '@/components/ui';

type Search = Promise<{
  shares?: string;
  price?: string;
  total?: string;
  confirmation?: string;
}>;

export default async function PurchaseSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Search;
}) {
  const { id } = await params;
  const summary = await searchParams;
  const validInteger = (value?: string) => !!value && /^\d+$/.test(value) && value.length <= 78;
  const validHash = !!summary.confirmation && /^0x[0-9a-fA-F]{64}$/.test(summary.confirmation);

  if (!validInteger(id) || !validInteger(summary.shares) || !validInteger(summary.price) || !validInteger(summary.total) || !validHash) notFound();

  const shares = BigInt(summary.shares!);
  const price = BigInt(summary.price!);
  const total = BigInt(summary.total!);
  if (shares <= 0n || price <= 0n || total !== shares * price) notFound();

  return <section className="purchase-success">
    <div className="success-mark" aria-hidden="true">✓</div>
    <PageHeading eyebrow="PURCHASE CONFIRMED" title="Your shares are yours">Your purchase was confirmed on HSK Testnet and your portfolio is ready to view.</PageHeading>
    <div className="panel success-summary">
      <h2>Purchase summary</h2>
      <dl className="stats-grid">
        <Stat label="Quantity">{shares.toLocaleString('en-US')} shares</Stat>
        <Stat label="Price per share">{money(price)}</Stat>
        <Stat label="Total paid">{money(total)}</Stat>
        <Stat label="Confirmation">{shortAddress(summary.confirmation!)}</Stat>
      </dl>
      <a className="confirmation-link" href={`${hskTestnet.blockExplorers.default.url}/tx/${summary.confirmation}`} target="_blank" rel="noreferrer">View confirmation on HSK Testnet ↗</a>
    </div>
    <div className="success-actions">
      <Link className="button" href="/portfolio">Go to My portfolio</Link>
      <Link className="button button-secondary" href={`/properties/${BigInt(id)}`}>Back to property</Link>
    </div>
  </section>;
}
