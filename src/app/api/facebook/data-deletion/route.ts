// Next.js API route: proxies Facebook's Data Deletion callback to the backend.
// Facebook sends a POST with a `signed_request` form field to this URL.
// Register https://<your-domain>/api/facebook/data-deletion in:
//   Facebook App → Settings → Advanced → Data Deletion Request URL

import { NextRequest, NextResponse } from 'next/server';

const BACKEND = process.env.NEXT_PUBLIC_API_URL?.replace(/\/api$/, '') ?? 'http://localhost:8787';

export async function POST(req: NextRequest) {
  const formData = await req.formData();

  const backendRes = await fetch(`${BACKEND}/api/facebook/data-deletion`, {
    method: 'POST',
    body: formData,
  });

  const json = await backendRes.json();
  return NextResponse.json(json, { status: backendRes.status });
}

export async function GET() {
  // Facebook may probe the URL with GET; return a simple acknowledgement.
  return NextResponse.json({ message: 'Facebook Data Deletion endpoint. Send a POST request.' });
}
