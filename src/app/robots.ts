import type { MetadataRoute } from 'next'

/**
 * Crawlers already get redirected away from the private routes, but spelling
 * it out keeps stale links out of search results.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/writings', '/board'],
      disallow: [
        '/habits',
        '/schedule',
        '/finance',
        '/expenses',
        '/library',
        '/dashboard',
        '/write',
        '/login',
        '/api/',
      ],
    },
  }
}
