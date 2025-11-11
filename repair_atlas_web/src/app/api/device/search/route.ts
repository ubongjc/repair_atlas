import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { rateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { sanitizeSearchQuery } from '@/lib/sanitize';

/**
 * Manual device search - for when users know what they're looking for
 * Searches by brand, model, category, or keywords
 */

/**
 * @openapi
 * /api/device/search:
 *   get:
 *     summary: Search for devices manually
 *     description: Search device catalog by brand, model, category, or keywords
 *     tags:
 *       - Devices
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: brand
 *         schema:
 *           type: string
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 */
export async function GET(request: NextRequest) {
  try {
    const rateLimitResult = await rateLimit(request, 'authenticated');
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: rateLimitHeaders(rateLimitResult) }
      );
    }

    const user = await requireUser();
    const { searchParams } = new URL(request.url);

    const query = sanitizeSearchQuery(searchParams.get('q') || '');
    const brand = searchParams.get('brand');
    const category = searchParams.get('category');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);

    if (!query && !brand && !category) {
      return NextResponse.json(
        { error: 'At least one search parameter is required' },
        { status: 400 }
      );
    }

    // Build search conditions
    const where: Record<string, unknown> = {};

    if (brand) {
      where.brand = { contains: brand, mode: 'insensitive' };
    }

    if (category) {
      where.category = { equals: category, mode: 'insensitive' };
    }

    if (query) {
      where.OR = [
        { brand: { contains: query, mode: 'insensitive' } },
        { model: { contains: query, mode: 'insensitive' } },
        { modelNumber: { contains: query, mode: 'insensitive' } },
      ];
    }

    // Search in user's items first
    const userItems = await db.item.findMany({
      where: {
        userId: user.id,
        ...where,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    logger.info('Device search performed', {
      userId: user.id,
      query,
      brand,
      category,
      resultsCount: userItems.length,
    });

    return NextResponse.json({
      results: userItems.map((item: {
        id: string;
        brand: string | null;
        model: string | null;
        modelNumber: string | null;
        category: string | null;
        photoUrls: string[];
        confidence: number | null;
        createdAt: Date;
      }) => ({
        id: item.id,
        brand: item.brand,
        model: item.model,
        modelNumber: item.modelNumber,
        category: item.category,
        photoUrls: item.photoUrls,
        confidence: item.confidence,
        createdAt: item.createdAt.toISOString(),
      })),
      query: {
        q: query,
        brand,
        category,
      },
      count: userItems.length,
    });
  } catch (error) {
    logger.error('Device search failed', { error });

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    );
  }
}
