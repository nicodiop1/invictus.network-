import { NextResponse } from "next/server";
import { serverEnv } from "../../lib/config/env";

const JUPITER_SWAP_URL = "https://lite-api.jup.ag/swap/v1/swap";

export async function POST(request: Request) {
  let body: {
    quoteResponse?: unknown;
    userPublicKey?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request." },
      { status: 400 }
    );
  }

  if (!body.quoteResponse || !body.userPublicKey) {
    return NextResponse.json(
      { error: "A quote response and wallet address are required." },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(JUPITER_SWAP_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        quoteResponse: body.quoteResponse,
        userPublicKey: body.userPublicKey,
        wrapAndUnwrapSol: true,
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports: "auto",
        ...(serverEnv.feeAccount ? { feeAccount: serverEnv.feeAccount } : {}),
      }),
    });
    const result: unknown = await response.json();
    if (!response.ok) {
      return NextResponse.json(
        { error: "The liquidity venue could not build a swap transaction." },
        { status: response.status }
      );
    }
    return NextResponse.json(
      {
        ...(result as Record<string, unknown>),
        liveExecutionEnabled: serverEnv.tradingLiveExecutionEnabled,
      },
      {
        headers: { "cache-control": "no-store" },
      }
    );
  } catch {
    return NextResponse.json(
      { error: "The liquidity venue is unavailable. Try again shortly." },
      { status: 502 }
    );
  }
}
