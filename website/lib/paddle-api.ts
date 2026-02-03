// Paddle价格API集成
// 文档: https://developer.paddle.com/api-reference/prices/get-price

interface PaddlePrice {
  id: string;
  product_id: string;
  unit_price: {
    amount: string;
    currency_code: string;
  };
  billing_cycle?: {
    interval: 'day' | 'week' | 'month' | 'year';
    frequency: number;
  };
}

interface PaddlePriceResponse {
  data: PaddlePrice;
}

// 缓存价格（1小时）
const priceCache = new Map<string, { price: PaddlePrice; timestamp: number }>();
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

// 兜底价格（从数据库或硬编码）
const FALLBACK_PRICES: Record<string, number> = {
  'pri_starter': 999, // $9.99
  'pri_pro': 2999, // $29.99
  'pri_unlimited_monthly': 1499, // $14.99
  'pri_unlimited_yearly': 9999, // $99.99
};

/**
 * 从Paddle API获取价格
 */
export async function getPaddlePrice(priceId: string): Promise<number | null> {
  try {
    // 检查缓存
    const cached = priceCache.get(priceId);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return parseFloat(cached.price.unit_price.amount);
    }

    // 调用Paddle API
    const apiKey = process.env.PADDLE_API_KEY;
    if (!apiKey) {
      console.warn('PADDLE_API_KEY not configured, using fallback prices');
      return null;
    }

    const response = await fetch(
      `https://sandbox-api.paddle.com/prices/${priceId}`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
        // 添加超时
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!response.ok) {
      console.error(`Paddle API error: ${response.status}`);
      return null;
    }

    const data: PaddlePriceResponse = await response.json();

    // 缓存结果
    priceCache.set(priceId, {
      price: data.data,
      timestamp: Date.now(),
    });

    // 返回价格（单位：分）
    return parseFloat(data.data.unit_price.amount);

  } catch (error) {
    console.error('Failed to fetch Paddle price:', error);
    return null;
  }
}

/**
 * 获取价格（带兜底）
 */
export async function getPriceWithFallback(priceId: string): Promise<number> {
  const paddlePrice = await getPaddlePrice(priceId);

  if (paddlePrice !== null) {
    return paddlePrice;
  }

  // 使用兜底价格
  return FALLBACK_PRICES[priceId] || 0;
}

/**
 * 批量获取价格
 */
export async function getBulkPrices(priceIds: string[]): Promise<Record<string, number>> {
  const prices: Record<string, number> = {};

  await Promise.all(
    priceIds.map(async (priceId) => {
      prices[priceId] = await getPriceWithFallback(priceId);
    })
  );

  return prices;
}

/**
 * 清除价格缓存
 */
export function clearPriceCache(priceId?: string) {
  if (priceId) {
    priceCache.delete(priceId);
  } else {
    priceCache.clear();
  }
}
