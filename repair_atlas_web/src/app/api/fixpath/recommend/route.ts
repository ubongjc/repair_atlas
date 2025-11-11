import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { rateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { checkSubscriptionAccess } from '@/lib/stripe';

/**
 * @openapi
 * /api/fixpath/recommend:
 *   post:
 *     summary: Get AI-powered fix path recommendations
 *     description: Generate fix path recommendations based on defect symptoms and item details
 *     tags:
 *       - Fix Paths
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - defectId
 *             properties:
 *               defectId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Fix path recommendations
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Subscription required
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimit(request, 'authenticated');
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        {
          status: 429,
          headers: rateLimitHeaders(rateLimitResult),
        }
      );
    }

    const user = await requireUser();
    const body = await request.json();
    const { defectId } = body;

    if (!defectId) {
      return NextResponse.json(
        { error: 'Defect ID is required' },
        { status: 400 }
      );
    }

    // Get defect with item details
    const defect = await db.defect.findUnique({
      where: { id: defectId },
      include: {
        item: true,
      },
    });

    if (!defect || defect.userId !== user.id) {
      return NextResponse.json(
        { error: 'Defect not found or unauthorized' },
        { status: 404 }
      );
    }

    // Check for existing fix paths
    const existingFixPaths = await db.fixPath.findMany({
      where: { defectId },
      include: { parts: true },
      orderBy: { provenanceScore: 'desc' },
    });

    if (existingFixPaths.length > 0) {
      return NextResponse.json({
        recommendations: existingFixPaths.map((fp: {
          id: string;
          title: string;
          difficulty: string;
          riskLevel: string;
          estimatedTime: number;
          estimatedCost: number | null;
          provenanceScore: number;
          sourceType: string;
        }) => ({
          id: fp.id,
          title: fp.title,
          difficulty: fp.difficulty,
          riskLevel: fp.riskLevel,
          estimatedTime: fp.estimatedTime,
          estimatedCost: fp.estimatedCost,
          provenanceScore: fp.provenanceScore,
          sourceType: fp.sourceType,
          warrantyImpact: fp.warrantyImpact,
          partsCount: fp.parts.length,
        })),
      });
    }

    // Check if user has pro subscription for AI recommendations
    const hasPro = await checkSubscriptionAccess(user.clerkId);

    if (!hasPro) {
      return NextResponse.json(
        {
          error: 'Pro subscription required for AI-powered recommendations',
          upgradeUrl: '/subscription',
        },
        { status: 403 }
      );
    }

    // TODO: Generate AI-powered fix path recommendations
    // For now, return a placeholder
    logger.info('AI fix path recommendation requested', {
      userId: user.id,
      defectId,
      item: {
        brand: defect.item.brand,
        model: defect.item.model,
        category: defect.item.category,
      },
      symptoms: defect.symptoms,
    });

    // Placeholder AI-generated fix path
    const aiFixPath = await db.fixPath.create({
      data: {
        defectId,
        userId: user.id,
        title: `Repair ${defect.symptoms.join(', ')} - ${defect.item.brand} ${defect.item.model}`,
        steps: [
          {
            number: 1,
            title: 'Diagnose the issue',
            description: 'Verify the symptoms and identify the root cause',
            estimatedTime: 15,
            images: [],
            warnings: [],
          },
          {
            number: 2,
            title: 'Gather necessary tools',
            description: 'Collect all required tools before starting',
            estimatedTime: 10,
            images: [],
            warnings: [],
          },
          {
            number: 3,
            title: 'Follow repair steps',
            description: 'Complete the repair following safety guidelines',
            estimatedTime: 30,
            images: [],
            warnings: ['Power off device before repair', 'Handle components with care'],
          },
        ],
        difficulty: 'MEDIUM',
        riskLevel: 'MEDIUM',
        estimatedTime: 60,
        estimatedCost: 25.0,
        currency: 'USD',
        sourceType: 'AI_GENERATED',
        warrantyImpact: 'May void warranty - check manufacturer policy',
        safetyWarnings: [
          'Disconnect power before starting',
          'Use proper tools to avoid damage',
          'Work in well-lit area',
        ],
        requiredSkills: ['Basic electronics knowledge', 'Tool handling'],
        provenanceScore: 0.7,
      },
    });

    return NextResponse.json({
      recommendations: [
        {
          id: aiFixPath.id,
          title: aiFixPath.title,
          difficulty: aiFixPath.difficulty,
          riskLevel: aiFixPath.riskLevel,
          estimatedTime: aiFixPath.estimatedTime,
          estimatedCost: aiFixPath.estimatedCost,
          provenanceScore: aiFixPath.provenanceScore,
          sourceType: aiFixPath.sourceType,
          warrantyImpact: aiFixPath.warrantyImpact,
        },
      ],
    });
  } catch (error) {
    logger.error('Failed to generate fix path recommendations', { error });

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to generate recommendations' },
      { status: 500 }
    );
  }
}
