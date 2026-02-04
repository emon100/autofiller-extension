/**
 * 获取站点 URL
 * 优先使用 NEXT_PUBLIC_SITE_URL，否则使用 Vercel 自动提供的 VERCEL_URL
 */
export function getSiteUrl(): string {
  // 优先使用明确设置的 URL
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }

  // Vercel 部署时自动获取
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  // 本地开发
  return 'http://localhost:3000';
}
