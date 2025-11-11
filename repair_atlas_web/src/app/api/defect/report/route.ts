import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { uploadToR2, generateStorageKey } from '@/lib/storage';
import { rateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { logUserAction, AuditAction } from '@/lib/audit';
import { z } from 'zod';

const DefectReportSchema = z.object({
  itemId: z.string(),
  symptoms: z.array(z.string()).min(1),
  description: z.string().optional(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
});

/**
 * @openapi
 * /api/defect/report:
 *   post:
 *     summary: Report a defect for an item
 *     description: Create a new defect report with symptoms, photos, and severity
 *     tags:
 *       - Defects
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - itemId
 *               - symptoms
 *             properties:
 *               itemId:
 *                 type: string
 *                 description: ID of the item with the defect
 *               symptoms:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: List of symptoms
 *               description:
 *                 type: string
 *                 description: Detailed description of the defect
 *               severity:
 *                 type: string
 *                 enum: [LOW, MEDIUM, HIGH, CRITICAL]
 *               photos:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Defect reported successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
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
    const formData = await request.formData();

    // Parse and validate request
    const itemId = formData.get('itemId') as string;
    const symptomsRaw = formData.get('symptoms') as string;
    const description = formData.get('description') as string | null;
    const severity = formData.get('severity') as string | null;

    const validatedData = DefectReportSchema.parse({
      itemId,
      symptoms: JSON.parse(symptomsRaw),
      description,
      severity: severity || 'MEDIUM',
    });

    // Verify item belongs to user
    const item = await db.item.findUnique({
      where: { id: validatedData.itemId },
    });

    if (!item || item.userId !== user.id) {
      return NextResponse.json(
        { error: 'Item not found or unauthorized' },
        { status: 404 }
      );
    }

    // Upload photos if provided
    const photoUrls: string[] = [];
    const photos = formData.getAll('photos') as File[];

    for (const photo of photos) {
      if (photo && photo.size > 0) {
        const arrayBuffer = await photo.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const storageKey = generateStorageKey(user.id, photo.name);
        const photoUrl = await uploadToR2(buffer, storageKey, photo.type);
        photoUrls.push(photoUrl);
      }
    }

    // Create defect
    const defect = await db.defect.create({
      data: {
        itemId: validatedData.itemId,
        userId: user.id,
        symptoms: validatedData.symptoms,
        description: validatedData.description || null,
        photoUrls,
        severity: validatedData.severity,
      },
    });

    // Audit log
    await logUserAction(
      AuditAction.DEFECT_REPORTED,
      user.clerkId,
      request,
      {
        defectId: defect.id,
        itemId: validatedData.itemId,
        severity: validatedData.severity,
      }
    );

    logger.info('Defect reported', {
      userId: user.id,
      defectId: defect.id,
      itemId: validatedData.itemId,
    });

    return NextResponse.json({
      id: defect.id,
      itemId: defect.itemId,
      symptoms: defect.symptoms,
      description: defect.description,
      photoUrls: defect.photoUrls,
      severity: defect.severity,
      createdAt: defect.createdAt.toISOString(),
    });
  } catch (error) {
    logger.error('Failed to report defect', { error });

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to report defect' },
      { status: 500 }
    );
  }
}

/**
 * @openapi
 * /api/defect/report:
 *   get:
 *     summary: List user's defect reports
 *     description: Get all defects reported by the current user
 *     tags:
 *       - Defects
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: itemId
 *         schema:
 *           type: string
 *         description: Filter by item ID
 *     responses:
 *       200:
 *         description: List of defects
 *       401:
 *         description: Unauthorized
 */
export async function GET(request: NextRequest) {
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
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('itemId');

    const defects = await db.defect.findMany({
      where: {
        userId: user.id,
        ...(itemId && { itemId }),
      },
      include: {
        item: {
          select: {
            brand: true,
            model: true,
            category: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({
      defects: defects.map((defect) => ({
        id: defect.id,
        itemId: defect.itemId,
        item: defect.item,
        symptoms: defect.symptoms,
        description: defect.description,
        photoUrls: defect.photoUrls,
        severity: defect.severity,
        createdAt: defect.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    logger.error('Failed to list defects', { error });

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to list defects' },
      { status: 500 }
    );
  }
}
