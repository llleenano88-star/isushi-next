import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/api/', '/admin', '/account', '/login', '/auth', '/checkout'] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
