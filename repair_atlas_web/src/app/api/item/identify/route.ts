import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { uploadToR2, generateStorageKey } from '@/lib/storage';
import { ItemIdentifyRequestSchema } from '@/types/api';
import { exiftool } from 'exiftool-vendored';

/**
 * @openapi
 * /api/item/identify:
 *   post:
 *     summary: Identify an item from a photo
 *     description: Upload a photo to identify the item, extract metadata, and create a record
 *     tags:
 *       - Items
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Image file of the item
 *               category:
 *                 type: string
 *                 description: Optional category hint
 *     responses:
 *       200:
 *         description: Item identified successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();

    const formData = await request.formData();
    const imageFile = formData.get('image') as File;
    const category = formData.get('category') as string | null;

    if (!imageFile) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Image file is required' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extract EXIF data for metadata
    let exifData: Record<string, unknown> = {};
    try {
      const tempPath = `/tmp/${Date.now()}-${imageFile.name}`;
      const fs = await import('fs/promises');
      await fs.writeFile(tempPath, buffer);
      exifData = await exiftool.read(tempPath) as Record<string, unknown>;
      await fs.unlink(tempPath);
    } catch (error) {
      console.warn('Failed to extract EXIF data:', error);
    }

    // Upload to R2
    const storageKey = generateStorageKey(user.id, imageFile.name);
    const photoUrl = await uploadToR2(buffer, storageKey, imageFile.type);

    // TODO: In production, call AI service for actual identification
    // For now, create a basic record with provided category
    const detectedCategory = category || 'electronics';

    // Create item record
    const item = await db.item.create({
      data: {
        userId: user.id,
        category: detectedCategory,
        photoUrls: [photoUrl],
        identifiedAt: new Date(),
        confidence: 0.5, // Placeholder
        metadata: exifData as Record<string, unknown>,
      },
    });

    return NextResponse.json({
      id: item.id,
      category: item.category,
      brand: item.brand,
      model: item.model,
      modelNumber: item.modelNumber,
      confidence: item.confidence,
      photoUrls: item.photoUrls,
      metadata: item.metadata,
      createdAt: item.createdAt.toISOString(),
    });
  } catch (error) {
    console.error('Item identification error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Failed to identify item' },
      { status: 500 }
    );
  }
}

/**
 * @openapi
 * /api/item/identify:
 *   get:
 *     summary: List user's identified items
 *     description: Get all items identified by the current user
 *     tags:
 *       - Items
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of items
 *       401:
 *         description: Unauthorized
 */
export async function GET() {
  try {
    const user = await requireUser();

    const items = await db.item.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({
      items: items.map((item: {
        id: string;
        category: string | null;
        brand: string | null;
        model: string | null;
        modelNumber: string | null;
        confidence: number | null;
        photoUrls: string[];
        metadata: unknown;
        createdAt: Date;
      }) => ({
        id: item.id,
        category: item.category,
        brand: item.brand,
        model: item.model,
        modelNumber: item.modelNumber,
        confidence: item.confidence,
        photoUrls: item.photoUrls,
        metadata: item.metadata,
        createdAt: item.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Failed to list items:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Failed to fetch items' },
      { status: 500 }
    );
  }
}
