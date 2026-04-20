// ── Sepolia test token addresses ──────────────────────────────────────────

export const SEPOLIA_TOKENS: Record<string, { address: string; symbol: string; decimals: number }> = {
  ETH:  { address: "0x0000000000000000000000000000000000000000", symbol: "ETH",  decimals: 18 },
  WETH: { address: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14", symbol: "WETH", decimals: 18 },
  USDC: { address: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", symbol: "USDC", decimals: 6  },
  UNI:  { address: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984", symbol: "UNI",  decimals: 18 },
};

// ── Types ─────────────────────────────────────────────────────────────────

export interface ContentPrice {
  infohash: string;
  sellerAddress: string;
  tokenAddress: string;
  tokenSymbol: string;
  amount: string;        // price in token base units (wei / smallest unit)
  description: string;
  createdAt: number;
}

export interface PaymentRecord {
  id: string;
  infohash: string;
  buyerAddress: string;
  sellerAddress: string;
  payTokenAddress: string;
  payTokenSymbol: string;
  payAmount: string;
  receiveTokenAddress: string;
  receiveTokenSymbol: string;
  receiveAmount: string;
  txHash: string;
  status: "pending" | "completed" | "failed";
  createdAt: number;
}

// ── In-memory stores ──────────────────────────────────────────────────────

const contentPrices = new Map<string, ContentPrice>();   // infohash -> price
const paymentRecords: PaymentRecord[] = [];
const accessGrants = new Map<string, Set<string>>();     // infohash -> Set<buyerAddress>

// ── Content pricing ──────────────────────────────────────────────────────

export function setContentPrice(price: ContentPrice): void {
  contentPrices.set(price.infohash, price);
}

export function getContentPrice(infohash: string): ContentPrice | null {
  return contentPrices.get(infohash) ?? null;
}

export function getAllPricedContent(): ContentPrice[] {
  return Array.from(contentPrices.values());
}

export function removeContentPrice(infohash: string): void {
  contentPrices.delete(infohash);
}

// ── Payment records ──────────────────────────────────────────────────────

export function addPaymentRecord(record: PaymentRecord): void {
  paymentRecords.push(record);
}

export function getPaymentsByBuyer(address: string): PaymentRecord[] {
  const lower = address.toLowerCase();
  return paymentRecords.filter((r) => r.buyerAddress.toLowerCase() === lower);
}

export function getAllPaymentRecords(): PaymentRecord[] {
  return [...paymentRecords];
}

// ── Access grants ────────────────────────────────────────────────────────

export function grantAccess(infohash: string, buyerAddress: string): void {
  const set = accessGrants.get(infohash) ?? new Set();
  set.add(buyerAddress.toLowerCase());
  accessGrants.set(infohash, set);
}

export function hasAccess(infohash: string, buyerAddress: string): boolean {
  return accessGrants.get(infohash)?.has(buyerAddress.toLowerCase()) ?? false;
}

export function getAccessList(infohash: string): string[] {
  return Array.from(accessGrants.get(infohash) ?? []);
}
