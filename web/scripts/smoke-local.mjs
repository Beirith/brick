// Requires anvil --port 8547. Uses only Anvil's public, unfunded-outside-local mnemonic.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createPublicClient, createWalletClient, http, parseAbi } from 'viem';
import { mnemonicToAccount } from 'viem/accounts';
import { foundry } from 'viem/chains';
const transport = http('http://127.0.0.1:8547');
const publicClient = createPublicClient({ chain: foundry, transport });
assert.equal(await publicClient.getChainId(), 31337, 'Local chain required');
const phrase = 'test test test test test test test test test test test junk';
const seller = createWalletClient({ account: mnemonicToAccount(phrase), chain: foundry, transport });
const buyer = createWalletClient({ account: mnemonicToAccount(phrase, { addressIndex: 1 }), chain: foundry, transport });
const artifact = name => (() => { const compiled = JSON.parse(readFileSync(new URL(`../../contracts/out/${name}.sol/${name}.json`, import.meta.url), 'utf8')); return { abi: compiled.abi, bytecode: compiled.bytecode.object }; })();
const currencyArtifact = artifact('MockBRL');
const factoryArtifact = artifact('PropertyFactory');
const marketArtifact = artifact('PropertyMarketplace');
async function receipt(hash) { const result = await publicClient.waitForTransactionReceipt({ hash }); assert.equal(result.status, 'success'); return result; }
async function deploy(value, args = []) { return (await receipt(await seller.deployContract({ ...value, args }))).contractAddress; }
async function write(wallet, address, abi, functionName, args) {
  const { request } = await publicClient.simulateContract({ account: wallet.account, address, abi, functionName, args });
  await receipt(await wallet.writeContract(request));
}
const currency = await deploy(currencyArtifact);
const factory = await deploy(factoryArtifact);
const market = await deploy(marketArtifact, [factory, currency]);
await write(seller, factory, factoryArtifact.abi, 'createProperty', ['Apartamento Demo', 'FLP', 100n, 500_000_000_000n, '']);
const [token] = await publicClient.readContract({ address: factory, abi: factoryArtifact.abi, functionName: 'properties', args: [0n] });
const tokenAbi = parseAbi(['function approve(address,uint256) returns (bool)', 'function balanceOf(address) view returns (uint256)']);
await write(seller, token, tokenAbi, 'approve', [market, 10n]);
await write(seller, market, marketArtifact.abi, 'createListing', [token, 10n, 5_000_000_000n]);
await write(buyer, currency, currencyArtifact.abi, 'mint', [buyer.account.address, 500_000_000_000n]);
await write(buyer, currency, currencyArtifact.abi, 'approve', [market, 10_000_000_000n]);
await write(buyer, market, marketArtifact.abi, 'buyShares', [0n, 2n]);
const balance = (address, abi, owner) => publicClient.readContract({ address, abi, functionName: 'balanceOf', args: [owner] });
assert.equal(await balance(token, tokenAbi, buyer.account.address), 2n);
assert.equal(await balance(currency, currencyArtifact.abi, seller.account.address), 10_000_000_000n);
await write(seller, market, marketArtifact.abi, 'cancelListing', [0n]);
assert.equal(await balance(token, tokenAbi, seller.account.address), 98n);
assert.equal(await balance(token, tokenAbi, market), 0n);
console.log('PASS: exported bytecode deployment, property creation, listing, mint, approval, purchase and cancellation; buyer 2 shares, seller 98, seller 10000 mBRL.');
