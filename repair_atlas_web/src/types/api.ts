import { z } from 'zod';

// ============================================================
// Item Identification
// ============================================================

export const ItemIdentifyRequestSchema = z.object({
  image: z.string().describe('Base64 encoded image or file upload'),
  category: z.string().optional().describe('Optional category hint'),
});

export type ItemIdentifyRequest = z.infer<typeof ItemIdentifyRequestSchema>;

export const ItemIdentifyResponseSchema = z.object({
  id: z.string(),
  category: z.string(),
  brand: z.string().nullable(),
  model: z.string().nullable(),
  modelNumber: z.string().nullable(),
  confidence: z.number().nullable(),
  photoUrls: z.array(z.string()),
  metadata: z.record(z.unknown()).nullable(),
  createdAt: z.string(),
});

export type ItemIdentifyResponse = z.infer<typeof ItemIdentifyResponseSchema>;

// ============================================================
// Defect Reporting
// ============================================================

export const DefectReportRequestSchema = z.object({
  itemId: z.string(),
  symptoms: z.array(z.string()),
  description: z.string().optional(),
  photos: z.array(z.string()).optional(), // Base64 encoded
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
});

export type DefectReportRequest = z.infer<typeof DefectReportRequestSchema>;

export const DefectReportResponseSchema = z.object({
  id: z.string(),
  itemId: z.string(),
  symptoms: z.array(z.string()),
  description: z.string().nullable(),
  photoUrls: z.array(z.string()),
  severity: z.string(),
  createdAt: z.string(),
});

export type DefectReportResponse = z.infer<typeof DefectReportResponseSchema>;

// ============================================================
// Fix Path
// ============================================================

export const FixPathResponseSchema = z.object({
  id: z.string(),
  defectId: z.string(),
  title: z.string(),
  steps: z.array(z.unknown()),
  estimatedTime: z.number().nullable(),
  difficulty: z.string(),
  riskLevel: z.string(),
  warrantyImpact: z.string().nullable(),
  safetyWarnings: z.array(z.string()),
  estimatedCost: z.number().nullable(),
  currency: z.string(),
  sourceType: z.string(),
  sourceUrl: z.string().nullable(),
  provenanceScore: z.number().nullable(),
  parts: z.array(z.unknown()),
  createdAt: z.string(),
});

export type FixPathResponse = z.infer<typeof FixPathResponseSchema>;

// ============================================================
// Error Response
// ============================================================

export const ErrorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
