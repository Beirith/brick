import assert from 'node:assert/strict';
import { test } from 'node:test';
import { maxUint256 } from 'viem';
import { amount, integer, money, totalPrice, referencePrice, percentage, percentageToShares, locationFromMetadata, formatPropertyValue, propertyValueAmount } from '../src/lib/format.ts';

test('amounts preserve six decimals and reject ambiguous or nonpositive input', () => {
  assert.equal(amount('5000.000001'), 5000000001n);
  for (const input of ['5,000', '0', '-1', '1.0000001', '1e6', '']) assert.throws(() => amount(input));
});
test('property value uses visible dot group separators without changing its amount', () => {
  assert.equal(formatPropertyValue('500000'), '500.000');
  assert.equal(formatPropertyValue('1.250.000'), '1.250.000');
  assert.equal(propertyValueAmount('1.250.000'), 1250000000000n);
});
test('percentage selling converts to whole shares', () => {
  assert.equal(percentageToShares('49', 10000n), 4900n);
  assert.equal(percentageToShares('49', 100n), 49n);
  assert.equal(percentageToShares('49', 90n), 44n);
  assert.equal(percentageToShares('100', 10000n), 10000n);
  assert.equal(percentageToShares('10', 100n), 10n);
  assert.equal(percentageToShares('12,5', 80n), 10n);
  assert.equal(percentageToShares('12.5', 80n), 10n);
  assert.throws(() => percentageToShares('0.01', 1n));
  assert.throws(() => percentageToShares('101', 100n));
});
test('whole shares and price products stay inside uint256', () => {
  for (const input of ['0', '-1', '1.5', '']) assert.throws(() => integer(input));
  assert.throws(() => integer((maxUint256 + 1n).toString()));
  assert.equal(totalPrice(2n, amount('5000')), 10000000000n);
  assert.throws(() => totalPrice(2n, maxUint256));
});
test('formatting preserves large values and tiny reference prices', () => {
  assert.equal(money(9007199254740993000001n), '9,007,199,254,740,993.000001 mBRL');
  assert.equal(referencePrice(1n, 100n), '< 0.000001 mBRL');
  assert.equal(referencePrice(500000000000n, 100n), '5,000 mBRL');
  assert.equal(percentage(2n, 100n), '2%');
});
test('location is read only from valid inline metadata', () => {
  assert.equal(locationFromMetadata(''), undefined);
  assert.equal(locationFromMetadata('https://example.com'), undefined);
  assert.equal(locationFromMetadata('data:application/json,%7B%22location%22%3A%22Floripa%22%7D'), 'Floripa');
  assert.equal(locationFromMetadata('{"location":42}'), undefined);
});
