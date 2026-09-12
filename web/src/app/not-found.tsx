import Link from 'next/link';
import { EmptyState } from '@/components/ui';
export default function NotFound() {
  return <EmptyState title="This page couldn’t be found"><Link className="button" href="/marketplace">Back to marketplace</Link></EmptyState>;
}
