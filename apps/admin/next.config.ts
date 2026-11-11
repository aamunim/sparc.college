import type { NextConfig } from 'next';

// static export (D3a, §৪.১): সার্ভার লাগে না — যেকোনো স্ট্যাটিক হোস্টিংয়ে (Cloudflare Pages) চলে।
// Supabase সরাসরি ব্রাউজার থেকে; গোপন কাজ Edge Function-এ।
const nextConfig: NextConfig = {
  output: 'export',
  reactStrictMode: true,
  transpilePackages: ['@sparc/core'],
  images: { unoptimized: true },
};

export default nextConfig;
