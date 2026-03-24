import { NextResponse } from 'next/server';

export function POST() {
  return NextResponse.json(
    {
      status: 'NOT_IMPLEMENTED',
      statusReason: 'Phase 5 will wire the shared chat workflow.'
    },
    { status: 501 }
  );
}
