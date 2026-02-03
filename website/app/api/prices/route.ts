import { NextResponse } from 'next/server';
import { getBulkPrices } from '@/lib/paddle-api';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const priceIds = searchParams.get('ids')?.split(',') || [];

  if (priceIds.length === 0) {
    return NextResponse.json(
      { error: 'Missing price IDs' },
      { status: 400 }
    );
  }

  try {
    const prices = await getBulkPrices(priceIds);

    return NextResponse.json({
      prices,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Error fetching prices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prices' },
      { status: 500 }
    );
  }
}
