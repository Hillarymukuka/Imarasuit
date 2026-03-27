export const runtime = 'edge';

// Proxies the deletion status lookup to the backend.
// Called by the /deletion-status frontend page.

import { NextRequest, NextResponse } from 'next/server';

const BACKEND = process.env.NEXT_PUBLIC_API_URL?.replace(/\/api$/, '') ?? 'http://localhost:8787';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const backendRes = await fetch(`${BACKEND}/api/facebook/data-deletion/status/${params.id}`);
  const json = await backendRes.json();
  return NextResponse.json(json, { status: backendRes.status });
}
