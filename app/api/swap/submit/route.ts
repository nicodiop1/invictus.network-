import { NextResponse } from "next/server";
import { serverEnv } from "../../../lib/config/env";

export async function POST(request: Request) {
  if (!serverEnv.tradingLiveExecutionEnabled) {
    return NextResponse.json(
      { error: "Live swap execution is disabled by configuration." },
      { status: 403 }
    );
  }
  if (!serverEnv.feeAccount) {
    return NextResponse.json(
      { error: "Live execution requires a verified Invictus fee account." },
      { status: 503 }
    );
  }

  const body = (await request.json()) as { signedTransaction?: string };
  if (!body.signedTransaction) {
    return NextResponse.json(
      { error: "A signed transaction is required." },
      { status: 400 }
    );
  }

  const rpcUrl = serverEnv.mainnetRpcUrls[0];
  const sendResponse = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "sendTransaction",
      params: [
        body.signedTransaction,
        { encoding: "base64", skipPreflight: true },
      ],
    }),
  });
  const sendBody = (await sendResponse.json()) as {
    result?: string;
    error?: { message?: string };
  };
  if (!sendResponse.ok || !sendBody.result) {
    return NextResponse.json(
      { error: sendBody.error?.message ?? "Transaction submission failed." },
      { status: 502 }
    );
  }

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const statusResponse = await fetch(rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "getSignatureStatuses",
        params: [[sendBody.result], { searchTransactionHistory: true }],
      }),
    });
    const statusBody = (await statusResponse.json()) as {
      result?: {
        value?: Array<{ err: unknown; confirmationStatus?: string } | null>;
      };
    };
    const status = statusBody.result?.value?.[0];
    if (status?.err) {
      return NextResponse.json(
        {
          error: "The swap transaction failed on-chain.",
          signature: sendBody.result,
        },
        { status: 502 }
      );
    }
    if (
      status?.confirmationStatus === "confirmed" ||
      status?.confirmationStatus === "finalized"
    ) {
      return NextResponse.json({
        signature: sendBody.result,
        confirmationStatus: status.confirmationStatus,
      });
    }
  }

  return NextResponse.json(
    {
      error: "Transaction confirmation timed out.",
      signature: sendBody.result,
    },
    { status: 504 }
  );
}
