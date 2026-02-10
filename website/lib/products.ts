// 数据库产品类型
export interface Product {
  id: string;
  paddle_product_id: string;
  paddle_price_id: string;
  name: string;
  description: string;
  type: 'one_time' | 'subscription';
  credits: number | null;
  price_amount: number;
  price_currency: string;
  billing_cycle: 'month' | 'year' | 'one_time';
  is_active: boolean;
  display_order: number;
  features: string[];
}

// 用于 pricing 页面的计划类型
export interface Plan {
  id: string;
  name: string;
  description: string;
  credits: string;
  features: string[];
  popular: boolean;
  monthlyPrice: number;
  yearlyPrice: number;
  monthlyPriceId: string;
  yearlyPriceId: string;
  isSubscription: boolean;
}

// 将数据库产品按计划分组
export function groupProductsByPlan(products: Product[]): Plan[] {
  const planMap = new Map<string, Plan>();

  // Initialize with Free plan
  planMap.set('free', {
    id: 'free',
    name: 'Free',
    description: 'Perfect for trying out 1Fillr',
    credits: '200 credits',
    features: ['Basic auto-fill', 'Local data storage', 'Standard support'],
    popular: false,
    monthlyPrice: 0,
    yearlyPrice: 0,
    monthlyPriceId: '',
    yearlyPriceId: '',
    isSubscription: false,
  });

  for (const product of products) {
    // 跳过价格为 0 的产品（通常是 Paddle price ID 配置有误，或者是我们硬编码的 Free 计划）
    if (product.price_amount <= 0) continue;

    const planName = product.name.split(' ')[0];
    const planId = planName.toLowerCase();
    const priceInDollars = product.price_amount / 100;
    const isMonthly = product.billing_cycle === 'month' || product.billing_cycle === 'one_time';
    const isSubscription = product.type === 'subscription';

    const existing = planMap.get(planId);
    if (existing) {
      if (isMonthly) {
        existing.monthlyPrice = priceInDollars;
        existing.monthlyPriceId = product.paddle_price_id;
      } else {
        existing.yearlyPrice = priceInDollars;
        existing.yearlyPriceId = product.paddle_price_id;
      }
    } else {
      planMap.set(planId, {
        id: planId,
        name: planName,
        description: isSubscription ? 'Subscription' : 'One-time purchase',
        credits: product.credits ? `${product.credits} credits` : 'Unlimited',
        features: product.features || [],
        popular: planId === 'unlimited',
        monthlyPrice: isMonthly ? priceInDollars : 0,
        yearlyPrice: isMonthly ? 0 : priceInDollars,
        monthlyPriceId: isMonthly ? product.paddle_price_id : '',
        yearlyPriceId: isMonthly ? '' : product.paddle_price_id,
        isSubscription,
      });
    }
  }

  // 一次性购买：月付/年付价格相同
  for (const plan of Array.from(planMap.values())) {
    if (!plan.isSubscription && plan.id !== 'free') {
      plan.yearlyPrice ||= plan.monthlyPrice;
      plan.yearlyPriceId ||= plan.monthlyPriceId;
    }
  }

  return Array.from(planMap.values());
}
