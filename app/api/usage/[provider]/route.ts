import { NextRequest, NextResponse } from "next/server";
import { providers } from "@/lib/providers/registry";

// One route for every provider: /api/usage/openai, /api/usage/anthropic,
// and any future id added to lib/providers/registry.ts. This file never
// needs to change when a new provider is added.
export async function POST(
  req: NextRequest,
  { params }: { params: { provider: string } }
) {
  const adapter = providers[params.provider];

  if (!adapter) {
    return NextResponse.json(
      { error: `Unknown usage provider "${params.provider}".` },
      { status: 404 }
    );
  }

  const { apiKey: pastedKey, days = 7 } = await req.json();

  // Prefer a key pasted into the UI; fall back to a server-configured
  // env var so the app can be set up once and just clicked afterward.
  const serverKey = process.env[adapter.envVar];
  const apiKey = pastedKey || serverKey;
  const usingServerKey = !pastedKey && !!serverKey;

  if (!apiKey) {
    return NextResponse.json(
      {
        error: `No ${adapter.name} key available. Paste one, or set ${adapter.envVar} in your environment to skip this every time.`,
      },
      { status: 400 }
    );
  }

  if (!apiKey.startsWith(adapter.keyPrefix)) {
    return NextResponse.json(
      {
        error: `This needs a ${adapter.name} Admin API key (starts with "${adapter.keyPrefix}"), not a regular key.`,
      },
      { status: 400 }
    );
  }

  try {
    const totals = await adapter.fetchUsage(apiKey, days);
    return NextResponse.json({
      ...totals,
      days,
      source: adapter.name,
      usingServerKey,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || `Could not reach ${adapter.name}'s usage API.` },
      { status: 500 }
    );
  }
}
