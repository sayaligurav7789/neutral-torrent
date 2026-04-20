import config from "../config/index";

const UNISWAP_BASE = config.uniswapApiBaseUrl;

function headers(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    ...(config.uniswapApiKey ? { "x-api-key": config.uniswapApiKey } : {}),
  };
}

// ── Uniswap API response types ───────────────────────────────────────────

export interface UniswapQuoteResponse {
  requestId: string;
  quote: {
    chainId: number;
    input: { token: string; amount: string };
    output: { token: string; amount: string };
    swapper: string;
  };
  routing: string;
  permitData?: unknown;
  gasEstimate?: string;
  gasFeeUSD?: string;
  priceImpact?: number;
  routeString?: string;
}

export interface UniswapApprovalResponse {
  requestId: string;
  approval: {
    to: string;
    data: string;
    value: string;
    gasLimit?: string;
  } | null;
  gasFee?: string;
}

export interface UniswapSwapResponse {
  requestId: string;
  swap: {
    to: string;
    data: string;
    value: string;
    gasLimit?: string;
    chainId: number;
  };
}

// ── Mock responses for demo without API key ──────────────────────────────

function mockQuote(params: {
  tokenIn: string;
  tokenOut: string;
  amount: string;
  swapper: string;
  chainId: number;
}): UniswapQuoteResponse {
  // Simulate: 1 WETH = 2500 USDC, 1 UNI = 8 USDC
  const mockRates: Record<string, number> = {
    "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238": 1,       // USDC = $1
    "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14": 2500,    // WETH = $2500
    "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984": 8,       // UNI = $8
    "0x0000000000000000000000000000000000000000": 2500,     // ETH = $2500
  };

  const inRate = mockRates[params.tokenIn] ?? 1;
  const outRate = mockRates[params.tokenOut] ?? 1;
  const outAmountBN = BigInt(params.amount);
  const inAmount = (outAmountBN * BigInt(Math.round(outRate * 1000)) / BigInt(Math.round(inRate * 1000))).toString();

  return {
    requestId: `mock-${Date.now()}`,
    quote: {
      chainId: params.chainId,
      input: { token: params.tokenIn, amount: inAmount },
      output: { token: params.tokenOut, amount: params.amount },
      swapper: params.swapper,
    },
    routing: "MOCK",
    gasEstimate: "150000",
    gasFeeUSD: "0.50",
    priceImpact: 0.1,
    routeString: `${params.tokenIn} -> ${params.tokenOut}`,
  };
}

function mockApproval(): UniswapApprovalResponse {
  return {
    requestId: `mock-${Date.now()}`,
    approval: null, // Already approved in mock mode
    gasFee: "0",
  };
}

function mockSwap(quote: UniswapQuoteResponse): UniswapSwapResponse {
  return {
    requestId: `mock-${Date.now()}`,
    swap: {
      to: "0x0000000000000000000000000000000000000000",
      data: "0x",
      value: "0",
      gasLimit: "200000",
      chainId: quote.quote.chainId,
    },
  };
}

// ── Live Uniswap API calls ───────────────────────────────────────────────

function isMockMode(): boolean {
  return !config.uniswapApiKey;
}

export async function getUniswapQuote(params: {
  tokenIn: string;
  tokenOut: string;
  amount: string;
  type: "EXACT_INPUT" | "EXACT_OUTPUT";
  swapper: string;
  chainId: number;
}): Promise<UniswapQuoteResponse> {
  if (isMockMode()) {
    console.log("[Uniswap] Mock mode — returning simulated quote");
    return mockQuote(params);
  }

  const body = {
    type: params.type,
    tokenIn: params.tokenIn,
    tokenOut: params.tokenOut,
    amount: params.amount,
    swapper: params.swapper,
    tokenInChainId: params.chainId,
    tokenOutChainId: params.chainId,
    protocols: ["V3"],
  };

  const res = await fetch(`${UNISWAP_BASE}/quote`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Uniswap quote failed (${res.status}): ${err}`);
  }

  return (await res.json()) as UniswapQuoteResponse;
}

export async function checkUniswapApproval(params: {
  walletAddress: string;
  token: string;
  amount: string;
  chainId: number;
}): Promise<UniswapApprovalResponse> {
  if (isMockMode()) {
    console.log("[Uniswap] Mock mode — returning simulated approval");
    return mockApproval();
  }

  const body = {
    walletAddress: params.walletAddress,
    token: params.token,
    amount: params.amount,
    chainId: params.chainId,
  };

  const res = await fetch(`${UNISWAP_BASE}/check_approval`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Uniswap approval check failed (${res.status}): ${err}`);
  }

  return (await res.json()) as UniswapApprovalResponse;
}

export async function getUniswapSwapCalldata(params: {
  quote: UniswapQuoteResponse;
  permitData?: unknown;
  signature?: string;
}): Promise<UniswapSwapResponse> {
  if (isMockMode()) {
    console.log("[Uniswap] Mock mode — returning simulated swap calldata");
    return mockSwap(params.quote);
  }

  const body = {
    quote: params.quote,
    permitData: params.permitData,
    signature: params.signature,
  };

  const res = await fetch(`${UNISWAP_BASE}/swap`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Uniswap swap failed (${res.status}): ${err}`);
  }

  return (await res.json()) as UniswapSwapResponse;
}
