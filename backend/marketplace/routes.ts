import { Router, Request, Response } from "express";
import { assertSigner } from "../utils/signatures";
import {
  setContentPrice,
  getContentPrice,
  getAllPricedContent,
  addPaymentRecord,
  grantAccess,
  hasAccess,
  SEPOLIA_TOKENS,
  type ContentPrice,
} from "./pricingStore";
import {
  getUniswapQuote,
  checkUniswapApproval,
  getUniswapSwapCalldata,
  type UniswapQuoteResponse,
} from "./uniswapClient";
import config from "../config/index";

const router = Router();

// ── GET /marketplace/listings ────────────────────────────────────────────

router.get("/listings", (_req: Request, res: Response): void => {
  const listings = getAllPricedContent();
  res.json({ listings });
});

// ── GET /marketplace/tokens ──────────────────────────────────────────────

router.get("/tokens", (_req: Request, res: Response): void => {
  res.json({ tokens: SEPOLIA_TOKENS });
});

// ── POST /marketplace/set-price ──────────────────────────────────────────

router.post("/set-price", async (req: Request, res: Response): Promise<void> => {
  const {
    infohash,
    tokenAddress,
    tokenSymbol,
    amount,
    description,
    sellerAddress,
    message,
    signature,
  } = req.body as {
    infohash: string;
    tokenAddress: string;
    tokenSymbol: string;
    amount: string;
    description: string;
    sellerAddress: string;
    message: string;
    signature: string;
  };

  if (!infohash || !tokenAddress || !amount || !sellerAddress || !message || !signature) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  try {
    assertSigner(message, signature, sellerAddress);
  } catch {
    res.status(401).json({ error: "Invalid signature" });
    return;
  }

  const price: ContentPrice = {
    infohash,
    sellerAddress,
    tokenAddress,
    tokenSymbol: tokenSymbol || "TOKEN",
    amount,
    description: description || "",
    createdAt: Date.now(),
  };

  setContentPrice(price);
  console.log(`[Marketplace] Price set: ${infohash} = ${amount} ${tokenSymbol} by ${sellerAddress}`);
  res.status(201).json({ success: true, listing: price });
});

// ── POST /marketplace/quote ──────────────────────────────────────────────

router.post("/quote", async (req: Request, res: Response): Promise<void> => {
  const { infohash, buyerAddress, payTokenAddress } = req.body as {
    infohash: string;
    buyerAddress: string;
    payTokenAddress: string;
  };

  if (!infohash || !buyerAddress || !payTokenAddress) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const price = getContentPrice(infohash);
  if (!price) {
    res.status(404).json({ error: "Content not found or has no price" });
    return;
  }

  // If buyer wants to pay with the same token the seller wants, no swap needed
  if (payTokenAddress.toLowerCase() === price.tokenAddress.toLowerCase()) {
    res.json({
      quoteId: `direct-${Date.now()}`,
      inputToken: payTokenAddress,
      outputToken: price.tokenAddress,
      inputAmount: price.amount,
      outputAmount: price.amount,
      exchangeRate: "1",
      gasEstimate: "0",
      priceImpact: "0",
      routeDescription: "Direct payment (no swap needed)",
      rawQuote: null,
      noSwapNeeded: true,
    });
    return;
  }

  try {
    const quote = await getUniswapQuote({
      tokenIn: payTokenAddress,
      tokenOut: price.tokenAddress,
      amount: price.amount,
      type: "EXACT_OUTPUT",
      swapper: buyerAddress,
      chainId: config.swapChainId,
    });

    res.json({
      quoteId: quote.requestId,
      inputToken: quote.quote.input.token,
      outputToken: quote.quote.output.token,
      inputAmount: quote.quote.input.amount,
      outputAmount: quote.quote.output.amount,
      exchangeRate: (
        Number(quote.quote.input.amount) / Number(quote.quote.output.amount)
      ).toFixed(6),
      gasEstimate: quote.gasEstimate ?? "N/A",
      priceImpact: quote.priceImpact?.toFixed(4) ?? "N/A",
      routeDescription: quote.routeString ?? quote.routing,
      rawQuote: quote,
      noSwapNeeded: false,
    });
  } catch (err) {
    console.error("[Marketplace] Quote error:", err);
    res.status(500).json({ error: "Failed to get swap quote" });
  }
});

// ── POST /marketplace/check-approval ─────────────────────────────────────

router.post("/check-approval", async (req: Request, res: Response): Promise<void> => {
  const { walletAddress, tokenAddress, amount } = req.body as {
    walletAddress: string;
    tokenAddress: string;
    amount: string;
  };

  if (!walletAddress || !tokenAddress || !amount) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  try {
    const result = await checkUniswapApproval({
      walletAddress,
      token: tokenAddress,
      amount,
      chainId: config.swapChainId,
    });

    res.json({
      isApproved: result.approval === null,
      approvalTx: result.approval,
      gasFee: result.gasFee ?? "0",
    });
  } catch (err) {
    console.error("[Marketplace] Approval check error:", err);
    res.status(500).json({ error: "Failed to check approval" });
  }
});

// ── POST /marketplace/swap ───────────────────────────────────────────────

router.post("/swap", async (req: Request, res: Response): Promise<void> => {
  const { quoteResponse, permitData, signature } = req.body as {
    quoteResponse: UniswapQuoteResponse;
    permitData?: unknown;
    signature?: string;
  };

  if (!quoteResponse) {
    res.status(400).json({ error: "Missing quote response" });
    return;
  }

  try {
    const result = await getUniswapSwapCalldata({
      quote: quoteResponse,
      permitData,
      signature,
    });

    res.json({
      to: result.swap.to,
      data: result.swap.data,
      value: result.swap.value,
      gasLimit: result.swap.gasLimit ?? "300000",
      chainId: result.swap.chainId,
    });
  } catch (err) {
    console.error("[Marketplace] Swap error:", err);
    res.status(500).json({ error: "Failed to get swap transaction" });
  }
});

// ── POST /marketplace/confirm-payment ────────────────────────────────────

router.post("/confirm-payment", async (req: Request, res: Response): Promise<void> => {
  const { infohash, buyerAddress, txHash, message, signature } = req.body as {
    infohash: string;
    buyerAddress: string;
    txHash: string;
    message: string;
    signature: string;
  };

  if (!infohash || !buyerAddress || !txHash || !message || !signature) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  try {
    assertSigner(message, signature, buyerAddress);
  } catch {
    res.status(401).json({ error: "Invalid signature" });
    return;
  }

  const price = getContentPrice(infohash);
  if (!price) {
    res.status(404).json({ error: "Content not found" });
    return;
  }

  // Grant access
  grantAccess(infohash, buyerAddress);

  // Record the payment
  addPaymentRecord({
    id: `pay-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    infohash,
    buyerAddress,
    sellerAddress: price.sellerAddress,
    payTokenAddress: "",  // filled by frontend in a production version
    payTokenSymbol: "",
    payAmount: "",
    receiveTokenAddress: price.tokenAddress,
    receiveTokenSymbol: price.tokenSymbol,
    receiveAmount: price.amount,
    txHash,
    status: "completed",
    createdAt: Date.now(),
  });

  console.log(`[Marketplace] Payment confirmed: ${buyerAddress} -> ${infohash} (tx: ${txHash})`);
  res.json({ success: true, accessGranted: true });
});

// ── GET /marketplace/access/:infohash/:address ───────────────────────────

router.get("/access/:infohash/:address", (req: Request, res: Response): void => {
  const { infohash, address } = req.params;
  const granted = hasAccess(infohash, address);
  res.json({ infohash, address, hasAccess: granted });
});

export default router;
