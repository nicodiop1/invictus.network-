import { NextResponse } from "next/server";
import { serverEnv } from "../../lib/config/env";

const JUPITER_QUOTE_URL = "https://lite-api.jup.ag/swap/v1/quote";
const SOL_MINT = "So11111111111111111111111111111111111111112";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const inputMint = params.get("inputMint");
  const outputMint = params.get("outputMint");
  const amount = params.get("amount");

  if (!inputMint || !outputMint || !amount || !/^\d+$/.test(amount)) {
    return NextResponse.json(
      { error: "inputMint, outputMint, and an integer amount are required." },
      { status: 400 }
    );
  }

  if (inputMint !== SOL_MINT && outputMint !== SOL_MINT) {
    return NextResponse.json(
      { error: "Quotes must include SOL as one side of the pair." },
      { status: 400 }
    );
  }

  if (inputMint === outputMint) {
    return NextResponse.json(
      { error: "Input and output assets must be different." },
      { status: 400 }
    );
  }

  const quoteUrl = new URL(JUPITER_QUOTE_URL);
  quoteUrl.searchParams.set("inputMint", inputMint);
  quoteUrl.searchParams.set("outputMint", outputMint);
  quoteUrl.searchParams.set("amount", amount);
  quoteUrl.searchParams.set("slippageBps", "50");
  quoteUrl.searchParams.set("restrictIntermediateTokens", "true");
  if (serverEnv.feeAccount) {
    quoteUrl.searchParams.set("platformFeeBps", "100");
  }

  try {
    const response = await fetch(quoteUrl, {
      headers: { accept: "application/json" },
      next: { revalidate: 10 },
    });

    const body: unknown = await response.json();
    if (!response.ok) {
      return NextResponse.json(
        { error: "The liquidity venue could not return a quote." },
        { status: response.status }
      );
    }

    return NextResponse.json(body, {
      headers: { "cache-control": "public, max-age=10" },
    });
  } catch {
    return NextResponse.json(
      { error: "The liquidity venue is unavailable. Try again shortly." },
      { status: 502 }
    );
  }
}
