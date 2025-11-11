import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { uploadToR2, generateStorageKey } from '@/lib/storage';
import { rateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { logUserAction, AuditAction } from '@/lib/audit';
import OpenAI from 'openai';
import sharp from 'sharp';
import { exiftool } from 'exiftool-vendored';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Advanced AI-powered device identification
 * Supports: Images, Model Numbers, Serial Numbers, Barcodes, Visual Search
 */

interface DeviceIdentificationResult {
  confidence: number;
  brand: string;
  model: string;
  modelNumber?: string;
  category: string;
  releaseYear?: number;
  specifications?: Record<string, unknown>;
  commonIssues?: string[];
  repairability?: number; // 1-10 scale
  imageUrl?: string;
}

async function identifyDeviceFromImage(
  imageBuffer: Buffer,
  userId: string
): Promise<DeviceIdentificationResult> {
  // 1. Extract EXIF data
  let exifData: Record<string, unknown> = {};
  try {
    const tempPath = `/tmp/${Date.now()}-device.jpg`;
    const fs = await import('fs/promises');
    await fs.writeFile(tempPath, imageBuffer);
    exifData = await exiftool.read(tempPath) as Record<string, unknown>;
    await fs.unlink(tempPath);
  } catch (error) {
    logger.warn('Failed to extract EXIF data', { error });
  }

  // 2. Optimize image for AI analysis
  const optimizedBuffer = await sharp(imageBuffer)
    .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();

  const base64Image = optimizedBuffer.toString('base64');

  // 3. Use OpenAI Vision API for device identification
  const visionResponse = await openai.chat.completions.create({
    model: 'gpt-4-vision-preview',
    max_tokens: 1000,
    messages: [
      {
        role: 'system',
        content: `You are an expert device identification assistant. Analyze images to identify electronic devices, appliances, vehicles, and tools. Provide detailed information including:
- Brand name
- Model name and number
- Device category
- Release year (if identifiable)
- Key specifications
- Common issues with this device
- Repairability score (1-10, where 10 is easiest to repair)

Return your response in JSON format with these exact fields:
{
  "brand": "string",
  "model": "string",
  "modelNumber": "string",
  "category": "string",
  "releaseYear": number,
  "specifications": {},
  "commonIssues": [],
  "repairability": number,
  "confidence": number (0-1)
}`,
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Identify this device. Be as specific as possible with brand, model, and model number. If you can see any text or labels, include them.',
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${base64Image}`,
              detail: 'high',
            },
          },
        ],
      },
    ],
  });

  const aiResult = visionResponse.choices[0].message.content;
  let deviceInfo: DeviceIdentificationResult;

  try {
    // Parse AI response
    const jsonMatch = aiResult?.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      deviceInfo = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('No JSON found in AI response');
    }
  } catch (error) {
    logger.error('Failed to parse AI vision response', { error, aiResult });

    // Fallback to basic identification
    deviceInfo = {
      brand: 'Unknown',
      model: 'Unidentified Device',
      category: 'electronics',
      confidence: 0.3,
      commonIssues: [],
      repairability: 5,
    };
  }

  // 4. Search internal device database for match
  const dbMatch = await searchDeviceDatabase({
    brand: deviceInfo.brand,
    model: deviceInfo.model,
    modelNumber: deviceInfo.modelNumber,
  });

  if (dbMatch) {
    // Merge AI results with database info
    deviceInfo = {
      ...deviceInfo,
      ...dbMatch,
      confidence: Math.max(deviceInfo.confidence || 0, 0.9), // High confidence if in DB
    };
  }

  return deviceInfo;
}

async function searchDeviceDatabase(query: {
  brand?: string;
  model?: string;
  modelNumber?: string;
}): Promise<Partial<DeviceIdentificationResult> | null> {
  try {
    // Search for exact matches first
    if (query.brand && query.model) {
      // TODO: Search in device catalog table
      // For now, return null - will be populated with device database
      return null;
    }
    return null;
  } catch (error) {
    logger.error('Device database search failed', { error, query });
    return null;
  }
}

async function extractTextFromImage(imageBuffer: Buffer): Promise<string[]> {
  // Use OpenAI Vision for OCR
  const base64Image = imageBuffer.toString('base64');

  const ocrResponse = await openai.chat.completions.create({
    model: 'gpt-4-vision-preview',
    max_tokens: 500,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Extract all visible text from this image, especially model numbers, serial numbers, and brand names. Return as a JSON array of strings.',
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${base64Image}`,
            },
          },
        ],
      },
    ],
  });

  const result = ocrResponse.choices[0].message.content;
  try {
    const jsonMatch = result?.match(/\[[\s\S]*\]/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : [];
  } catch {
    return result ? result.split('\n').filter(Boolean) : [];
  }
}

/**
 * @openapi
 * /api/device/identify:
 *   post:
 *     summary: Advanced device identification
 *     description: Identify devices using AI vision, OCR, model numbers, or barcodes
 *     tags:
 *       - Devices
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *               modelNumber:
 *                 type: string
 *               brand:
 *                 type: string
 *               category:
 *                 type: string
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting - use upload tier for image analysis
    const rateLimitResult = await rateLimit(request, 'upload');
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait before uploading more images.' },
        { status: 429, headers: rateLimitHeaders(rateLimitResult) }
      );
    }

    const user = await requireUser();
    const formData = await request.formData();

    const imageFile = formData.get('image') as File | null;
    const modelNumberHint = formData.get('modelNumber') as string | null;
    const brandHint = formData.get('brand') as string | null;
    const categoryHint = formData.get('category') as string | null;

    if (!imageFile && !modelNumberHint) {
      return NextResponse.json(
        { error: 'Either image or model number is required' },
        { status: 400 }
      );
    }

    let deviceInfo: DeviceIdentificationResult;

    // If image provided, use AI vision
    if (imageFile) {
      const arrayBuffer = await imageFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Identify device from image
      deviceInfo = await identifyDeviceFromImage(buffer, user.id);

      // Extract any visible text (model numbers, serial numbers)
      const extractedText = await extractTextFromImage(buffer);
      if (extractedText.length > 0) {
        logger.info('Extracted text from image', { text: extractedText, userId: user.id });
        // Update model number if found
        const modelPattern = /[A-Z0-9]{4,}/;
        const possibleModelNumber = extractedText.find((text) => modelPattern.test(text));
        if (possibleModelNumber && !deviceInfo.modelNumber) {
          deviceInfo.modelNumber = possibleModelNumber;
        }
      }

      // Upload original image to R2
      const storageKey = generateStorageKey(user.id, imageFile.name);
      const photoUrl = await uploadToR2(buffer, storageKey, imageFile.type);
      deviceInfo.imageUrl = photoUrl;
    } else {
      // Search by model number only
      deviceInfo = await searchByModelNumber(modelNumberHint!, brandHint);
    }

    // Apply user hints to improve accuracy
    if (brandHint && deviceInfo.confidence < 0.9) {
      deviceInfo.brand = brandHint;
    }
    if (categoryHint && deviceInfo.confidence < 0.9) {
      deviceInfo.category = categoryHint;
    }

    // Create item in database
    const item = await db.item.create({
      data: {
        userId: user.id,
        category: deviceInfo.category,
        brand: deviceInfo.brand,
        model: deviceInfo.model,
        modelNumber: deviceInfo.modelNumber || null,
        photoUrls: deviceInfo.imageUrl ? [deviceInfo.imageUrl] : [],
        identifiedAt: new Date(),
        confidence: deviceInfo.confidence,
        metadata: {
          specifications: deviceInfo.specifications || {},
          commonIssues: deviceInfo.commonIssues || [],
          repairability: deviceInfo.repairability || 5,
          releaseYear: deviceInfo.releaseYear,
        },
      },
    });

    // Audit log
    await logUserAction(AuditAction.ITEM_CREATED, user.clerkId, request, {
      itemId: item.id,
      brand: deviceInfo.brand,
      model: deviceInfo.model,
      confidence: deviceInfo.confidence,
    });

    logger.info('Device identified', {
      userId: user.id,
      itemId: item.id,
      brand: deviceInfo.brand,
      model: deviceInfo.model,
      confidence: deviceInfo.confidence,
    });

    return NextResponse.json({
      id: item.id,
      category: item.category,
      brand: item.brand,
      model: item.model,
      modelNumber: item.modelNumber,
      confidence: deviceInfo.confidence,
      photoUrls: item.photoUrls,
      metadata: deviceInfo,
      createdAt: item.createdAt.toISOString(),
      suggestions: {
        nextSteps: [
          'Review device specifications',
          'Check common issues',
          'Report any defects or problems',
        ],
        commonIssues: deviceInfo.commonIssues || [],
        repairability: {
          score: deviceInfo.repairability || 5,
          description: getRepairabilityDescription(deviceInfo.repairability || 5),
        },
      },
    });
  } catch (error) {
    logger.error('Device identification failed', { error });

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to identify device. Please try again or enter details manually.' },
      { status: 500 }
    );
  }
}

async function searchByModelNumber(
  modelNumber: string,
  brand?: string | null
): Promise<DeviceIdentificationResult> {
  // TODO: Search device database by model number
  // For now, return basic info
  return {
    brand: brand || 'Unknown',
    model: modelNumber,
    modelNumber,
    category: 'electronics',
    confidence: 0.5,
    commonIssues: [],
    repairability: 5,
  };
}

function getRepairabilityDescription(score: number): string {
  if (score >= 9) return 'Excellent - Very easy to repair with basic tools';
  if (score >= 7) return 'Good - Moderately easy to repair';
  if (score >= 5) return 'Fair - Some specialized tools may be needed';
  if (score >= 3) return 'Difficult - Requires advanced skills and tools';
  return 'Very Difficult - Professional repair recommended';
}
