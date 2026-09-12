import { formatUnits, maxUint256, parseUnits } from 'viem';

export function money(value: bigint) {
  const [whole, fraction] = formatUnits(value, 6).split('.');
  return `${BigInt(whole).toLocaleString('en-US')}${fraction ? `.${fraction}` : ''} mBRL`;
}
export function integer(value: string) {
  if (!/^\d+$/.test(value)) throw new Error('Enter a positive whole number of shares.');
  const result = BigInt(value);
  if (result <= 0n || result > maxUint256) throw new Error('Enter a valid positive number of shares.');
  return result;
}
export function amount(value: string) {
  if (!/^\d+(\.\d{1,6})?$/.test(value)) throw new Error('Enter a positive amount with up to 6 decimal places. Use a decimal point and no commas.');
  const result = parseUnits(value, 6);
  if (result <= 0n || result > maxUint256) throw new Error('Enter a valid positive amount.');
  return result;
}
/** Formats whole mBRL values with dot group separators for quick scanning. */
export function formatPropertyValue(value: string) {
  const digits = value.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  if (!digits) return '';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
/** Parses the display form used by the property value field. */
export function propertyValueAmount(value: string) {
  const normalized = value.replace(/\./g, '');
  return amount(normalized);
}
export function totalPrice(shares: bigint, price: bigint) {
  const result = shares * price;
  if (result > maxUint256) throw new Error('This offer is too large. Reduce the quantity or price.');
  return result;
}
export function referencePrice(value: bigint, shares: bigint) {
  if (shares <= 0n) return '—';
  if (value < shares) return '< 0.000001 mBRL';
  return `${value % shares ? '≈ ' : ''}${money(value / shares)}`;
}
export function percentage(owned: bigint, supply: bigint) {
  return supply ? `${formatUnits(owned * 10000n / supply, 2)}%` : '0%';
}
export function percentageToShares(value: string, owned: bigint) {
  const normalized = value.replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) throw new Error('Enter a percentage between 0.01 and 100.');
  const basisPoints = parseUnits(normalized, 2);
  if (basisPoints <= 0n || basisPoints > 10000n) throw new Error('Enter a percentage between 0.01 and 100.');
  const shares = owned * basisPoints / 10000n;
  if (shares === 0n) throw new Error('This percentage is smaller than one whole share.');
  return shares;
}
export function shortAddress(value: string) { return `${value.slice(0, 6)}…${value.slice(-4)}`; }
export function locationFromMetadata(uri: string): string | undefined {
  // Only optional inline metadata; never fetch arbitrary URLs from public entries.
  try {
    const raw = uri.startsWith('data:application/json,') ? decodeURIComponent(uri.slice(22)) : uri;
    const metadata = JSON.parse(raw);
    return typeof metadata.location === 'string' ? metadata.location.slice(0, 160) : undefined;
  } catch { return undefined; }
}
