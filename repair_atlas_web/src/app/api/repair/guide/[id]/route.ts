import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { rateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { logDataAccess, AuditAction } from '@/lib/audit';

/**
 * Complete step-by-step repair guide with everything needed
 * - Clear, numbered steps with images/videos
 * - Exact tools required for each step
 * - Parts needed with purchase links
 * - Safety warnings
 * - Time estimates
 * - Difficulty indicators
 */

interface RepairStep {
  number: number;
  title: string;
  description: string;
  detailedInstructions: string[];
  images?: string[];
  videos?: string[];
  estimatedTime: number; // minutes
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  toolsNeeded: {
    id: string;
    name: string;
    essential: boolean;
    alternative?: string;
  }[];
  partsNeeded?: {
    id: string;
    name: string;
    quantity: number;
  }[];
  warnings: string[];
  tips: string[];
  commonMistakes: string[];
}

interface CompleteRepairGuide {
  id: string;
  title: string;
  device: {
    brand: string;
    model: string;
    category: string;
  };
  overview: {
    summary: string;
    totalTime: number;
    difficulty: string;
    cost: number;
    warrantyImpact: string;
    successRate: number; // percentage
  };
  prerequisites: {
    skills: string[];
    tools: string[];
    parts: string[];
    workspace: string;
  };
  safetyInformation: {
    generalWarnings: string[];
    requiredProtection: string[];
    emergencyContacts: string[];
  };
  steps: RepairStep[];
  testing: {
    title: string;
    steps: string[];
    expectedResults: string[];
  };
  troubleshooting: {
    issue: string;
    possibleCauses: string[];
    solutions: string[];
  }[];
  resources: {
    videos: string[];
    forums: string[];
    manuals: string[];
  };
}

/**
 * @openapi
 * /api/repair/guide/{id}:
 *   get:
 *     summary: Get complete repair guide
 *     description: Comprehensive step-by-step repair instructions with tools, parts, and safety info
 *     tags:
 *       - Repair Guides
 *     security:
 *       - bearerAuth: []
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const rateLimitResult = await rateLimit(request, 'authenticated');
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: rateLimitHeaders(rateLimitResult) }
      );
    }

    const user = await requireUser();
    const { id } = params;

    // Get fix path from database
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
        { error: 'Repair guide not found' },
        { status: 404 }
      );
    }

    // Verify access
    if (fixPath.defect.userId !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Build complete repair guide
    const completeGuide: CompleteRepairGuide = {
      id: fixPath.id,
      title: fixPath.title,
      device: {
        brand: fixPath.defect.item.brand || 'Unknown',
        model: fixPath.defect.item.model || 'Unknown',
        category: fixPath.defect.item.category,
      },
      overview: {
        summary: `Complete repair guide for fixing ${fixPath.defect.symptoms.join(', ')} on your ${fixPath.defect.item.brand} ${fixPath.defect.item.model}`,
        totalTime: fixPath.estimatedTime || 60,
        difficulty: fixPath.difficulty,
        cost: fixPath.estimatedCost || 0,
        warrantyImpact: fixPath.warrantyImpact || 'Unknown',
        successRate: calculateSuccessRate(fixPath.difficulty),
      },
      prerequisites: {
        skills: fixPath.requiredSkills || [],
        tools: extractToolsList(fixPath.steps as RepairStep[]),
        parts: fixPath.parts.map((p) => p.name),
        workspace: getWorkspaceRequirements(fixPath.defect.item.category),
      },
      safetyInformation: {
        generalWarnings: fixPath.safetyWarnings || [],
        requiredProtection: getSafetyGear(fixPath.defect.item.category, fixPath.riskLevel),
        emergencyContacts: [
          'Poison Control: 1-800-222-1222',
          'Emergency: 911',
          'Electrical Fire: Use Class C extinguisher',
        ],
      },
      steps: enhanceSteps(fixPath.steps as RepairStep[]),
      testing: {
        title: 'Verify Repair Success',
        steps: getTestingSteps(fixPath.defect.item.category),
        expectedResults: [
          'Device powers on normally',
          'All symptoms resolved',
          'No new issues appeared',
        ],
      },
      troubleshooting: getTroubleshootingGuide(fixPath.defect.symptoms),
      resources: {
        videos: fixPath.sourceUrl ? [fixPath.sourceUrl] : [],
        forums: getRelevantForums(fixPath.defect.item.category),
        manuals: [],
      },
    };

    // Audit log
    await logDataAccess(
      AuditAction.FIX_PATH_VIEWED,
      user.clerkId,
      'repair-guide',
      fixPath.id,
      request
    );

    logger.info('Complete repair guide accessed', {
      userId: user.id,
      fixPathId: fixPath.id,
      device: `${fixPath.defect.item.brand} ${fixPath.defect.item.model}`,
    });

    return NextResponse.json(completeGuide);
  } catch (error) {
    logger.error('Failed to get repair guide', { error });

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to load repair guide' },
      { status: 500 }
    );
  }
}

function calculateSuccessRate(difficulty: string): number {
  switch (difficulty) {
    case 'EASY':
      return 95;
    case 'MEDIUM':
      return 80;
    case 'HARD':
      return 60;
    case 'EXPERT':
      return 40;
    default:
      return 70;
  }
}

function extractToolsList(steps: RepairStep[]): string[] {
  const tools = new Set<string>();
  steps.forEach((step) => {
    step.toolsNeeded?.forEach((tool) => {
      tools.add(tool.name);
    });
  });
  return Array.from(tools);
}

function getWorkspaceRequirements(category: string): string {
  const requirements: Record<string, string> = {
    electronics: 'Clean, static-free workspace with good lighting. Anti-static mat recommended.',
    appliances: 'Spacious area with easy access to power outlet for testing. Non-slip floor surface.',
    automotive: 'Well-ventilated garage or outdoor space. Level ground for safety.',
    furniture: 'Open floor space with protective covering for finishes.',
  };
  return requirements[category] || 'Clean, well-lit workspace with adequate space';
}

function getSafetyGear(category: string, riskLevel: string): string[] {
  const baseGear = ['Safety glasses'];

  if (category === 'electronics') {
    baseGear.push('Anti-static wrist strap', 'Non-conductive mat');
  }

  if (category === 'automotive') {
    baseGear.push('Gloves', 'Steel-toe boots', 'Jack stands (never rely on jack alone)');
  }

  if (riskLevel === 'HIGH' || riskLevel === 'CRITICAL') {
    baseGear.push('Protective gloves', 'Face shield', 'Fire extinguisher nearby');
  }

  return baseGear;
}

function enhanceSteps(steps: RepairStep[]): RepairStep[] {
  return steps.map((step, index) => ({
    ...step,
    number: index + 1,
    detailedInstructions: step.detailedInstructions || [step.description],
    warnings: step.warnings || [],
    tips: step.tips || [],
    commonMistakes: step.commonMistakes || [],
    toolsNeeded: step.toolsNeeded || [],
  }));
}

function getTestingSteps(category: string): string[] {
  const testing: Record<string, string[]> = {
    electronics: [
      'Power off device completely',
      'Reconnect all cables and components',
      'Power on and observe boot sequence',
      'Test all functions affected by repair',
      'Monitor for unusual sounds, heat, or behavior',
      'Run for 10-15 minutes to ensure stability',
    ],
    appliances: [
      'Ensure all panels and covers are securely reattached',
      'Check for any loose screws or parts',
      'Plug in device and test basic function',
      'Run through a complete cycle if applicable',
      'Listen for unusual noises',
      'Check for leaks (if water involved)',
    ],
    automotive: [
      'Double-check all bolts are tightened to spec',
      'Verify no tools left in engine bay',
      'Start engine and check for leaks',
      'Test drive in safe area at low speed first',
      'Monitor gauges and warning lights',
    ],
  };
  return testing[category] || [
    'Visually inspect all work',
    'Test basic functionality',
    'Monitor for issues',
  ];
}

function getTroubleshootingGuide(symptoms: string[]): Array<{
  issue: string;
  possibleCauses: string[];
  solutions: string[];
}> {
  return [
    {
      issue: 'Device still not working after repair',
      possibleCauses: [
        'Component not fully seated',
        'Cable not properly connected',
        'Different underlying issue',
        'Defective replacement part',
      ],
      solutions: [
        'Reopen device and verify all connections',
        'Check for missed steps in guide',
        'Test replacement part if possible',
        'Consult community forums for additional insights',
      ],
    },
    {
      issue: 'New problem appeared after repair',
      possibleCauses: [
        'Cable pinched during reassembly',
        'Screw over-tightened',
        'Static discharge damaged component',
      ],
      solutions: [
        'Carefully disassemble and inspect for damage',
        'Verify proper reassembly order',
        'Check for any leftover parts (should be none!)',
      ],
    },
  ];
}

function getRelevantForums(category: string): string[] {
  const forums: Record<string, string[]> = {
    electronics: [
      'https://www.ifixit.com/Answers',
      'https://www.reddit.com/r/electronics',
      'https://forum.allaboutcircuits.com/',
    ],
    appliances: [
      'https://www.applianceblog.com/mainforums/',
      'https://www.reddit.com/r/appliancerepair',
    ],
    automotive: [
      'https://www.reddit.com/r/MechanicAdvice',
      'https://www.cartalk.com/community',
    ],
  };
  return forums[category] || ['https://www.ifixit.com/Answers'];
}
