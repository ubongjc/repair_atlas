import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { rateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { logDataAccess, AuditAction } from '@/lib/audit';

/**
 * @openapi
 * /api/fixpath/{id}:
 *   get:
 *     summary: Get fix path details
 *     description: Retrieve detailed information about a specific fix path
 *     tags:
 *       - Fix Paths
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Fix path details
 *       404:
 *         description: Fix path not found
 *       401:
 *         description: Unauthorized
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const { id } = params;

    const fixPath = await db.fixPath.findUnique({
      where: { id },
      include: {
        parts: true,
        defect: {
          include: {
            item: true,
          },
        },
      },
    });

    if (!fixPath) {
      return NextResponse.json(
        { error: 'Fix path not found' },
        { status: 404 }
      );
    }

    // Verify user has access (owns the defect)
    if (fixPath.defect.userId !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Audit log
    await logDataAccess(
      AuditAction.FIX_PATH_VIEWED,
      user.clerkId,
      'fixpath',
      fixPath.id,
      request
    );

    return NextResponse.json({
      id: fixPath.id,
      defectId: fixPath.defectId,
      title: fixPath.title,
      steps: fixPath.steps,
      estimatedTime: fixPath.estimatedTime,
      difficulty: fixPath.difficulty,
      riskLevel: fixPath.riskLevel,
      warrantyImpact: fixPath.warrantyImpact,
      safetyWarnings: fixPath.safetyWarnings,
      requiredSkills: fixPath.requiredSkills,
      estimatedCost: fixPath.estimatedCost,
      currency: fixPath.currency,
      sourceType: fixPath.sourceType,
      sourceUrl: fixPath.sourceUrl,
      verifiedAt: fixPath.verifiedAt?.toISOString(),
      verifiedBy: fixPath.verifiedBy,
      provenanceScore: fixPath.provenanceScore,
      parts: fixPath.parts.map((part) => ({
        id: part.id,
        name: part.name,
        partNumber: part.partNumber,
        compatibleModels: part.compatibleModels,
        estimatedCost: part.estimatedCost,
        currency: part.currency,
        affiliateUrl: part.affiliateUrl,
        availability: part.availability,
        alternativePartNumbers: part.alternativePartNumbers,
      })),
      createdAt: fixPath.createdAt.toISOString(),
    });
  } catch (error) {
    logger.error('Failed to get fix path', { error });

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to get fix path' },
      { status: 500 }
    );
  }
}
