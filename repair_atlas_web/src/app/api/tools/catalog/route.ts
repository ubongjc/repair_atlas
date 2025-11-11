import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { rateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

/**
 * Tool Catalog - comprehensive database of tools needed for repairs
 * Includes local availability, rental options, purchase links
 */

interface ToolInfo {
  id: string;
  name: string;
  category: string;
  description: string;
  essentialFor: string[]; // Device categories
  alternatives?: string[];
  avgPrice: number;
  whereToBuy: {
    amazon?: string;
    homeDepot?: string;
    localHardware?: boolean;
  };
  rentalAvailable: boolean;
  toolLibraries?: {
    id: string;
    name: string;
    distance: number;
    available: boolean;
  }[];
}

// Comprehensive tool database
const TOOL_CATALOG: Record<string, ToolInfo> = {
  'phillips-screwdriver-set': {
    id: 'phillips-screwdriver-set',
    name: 'Phillips Screwdriver Set',
    category: 'Hand Tools',
    description: 'Essential cross-head screwdrivers in multiple sizes (#0, #1, #2, #3)',
    essentialFor: ['electronics', 'appliances', 'furniture'],
    alternatives: ['Multi-bit screwdriver', 'Electric screwdriver'],
    avgPrice: 15.99,
    whereToBuy: {
      amazon: 'https://amazon.com/s?k=phillips+screwdriver+set',
      homeDepot: 'https://www.homedepot.com/s/phillips%2520screwdriver',
      localHardware: true,
    },
    rentalAvailable: false,
  },
  'spudger-set': {
    id: 'spudger-set',
    name: 'Plastic Spudger Set',
    category: 'Specialty Tools',
    description: 'Non-conductive prying tools for opening electronics without damage',
    essentialFor: ['electronics', 'smartphones', 'tablets'],
    alternatives: ['Guitar picks', 'Plastic cards (for basic prying)'],
    avgPrice: 8.99,
    whereToBuy: {
      amazon: 'https://amazon.com/s?k=spudger+set',
      localHardware: false,
    },
    rentalAvailable: false,
  },
  'multimeter': {
    id: 'multimeter',
    name: 'Digital Multimeter',
    category: 'Diagnostic Tools',
    description: 'Measure voltage, current, resistance for electrical diagnostics',
    essentialFor: ['electronics', 'appliances', 'automotive'],
    alternatives: ['Voltage tester (limited functionality)'],
    avgPrice: 25.99,
    whereToBuy: {
      amazon: 'https://amazon.com/s?k=digital+multimeter',
      homeDepot: 'https://www.homedepot.com/s/multimeter',
      localHardware: true,
    },
    rentalAvailable: true,
  },
  'heat-gun': {
    id: 'heat-gun',
    name: 'Heat Gun',
    category: 'Power Tools',
    description: 'Apply controlled heat for adhesive removal, shrink tubing, etc.',
    essentialFor: ['electronics', 'automotive', 'appliances'],
    alternatives: ['Hair dryer (limited heat)', 'Soldering iron (point heat only)'],
    avgPrice: 35.99,
    whereToBuy: {
      amazon: 'https://amazon.com/s?k=heat+gun',
      homeDepot: 'https://www.homedepot.com/s/heat%2520gun',
      localHardware: true,
    },
    rentalAvailable: true,
  },
  'torx-screwdriver-set': {
    id: 'torx-screwdriver-set',
    name: 'Torx Screwdriver Set (T5-T20)',
    category: 'Hand Tools',
    description: 'Star-shaped security screwdrivers common in modern electronics',
    essentialFor: ['electronics', 'automotive', 'appliances'],
    alternatives: ['iFixit toolkit (includes Torx)'],
    avgPrice: 12.99,
    whereToBuy: {
      amazon: 'https://amazon.com/s?k=torx+screwdriver+set',
      homeDepot: 'https://www.homedepot.com/s/torx%2520screwdriver',
      localHardware: true,
    },
    rentalAvailable: false,
  },
  'soldering-iron': {
    id: 'soldering-iron',
    name: 'Soldering Iron with Temperature Control',
    category: 'Electronics Tools',
    description: 'Join electrical components, fix broken solder joints',
    essentialFor: ['electronics'],
    alternatives: ['Soldering station (professional)', 'USB soldering iron (portable)'],
    avgPrice: 29.99,
    whereToBuy: {
      amazon: 'https://amazon.com/s?k=soldering+iron',
      localHardware: true,
    },
    rentalAvailable: true,
  },
  'ifixit-toolkit': {
    id: 'ifixit-toolkit',
    name: 'iFixit Essential Electronics Toolkit',
    category: 'Specialty Toolkits',
    description: 'Comprehensive toolkit with 64+ bits, spudgers, and opening tools',
    essentialFor: ['electronics', 'smartphones', 'laptops'],
    alternatives: ['Individual precision screwdrivers', 'Generic repair kit'],
    avgPrice: 69.99,
    whereToBuy: {
      amazon: 'https://www.amazon.com/iFixit-Essential-Electronics-Toolkit/dp/B0964G2Y7S',
      localHardware: false,
    },
    rentalAvailable: true,
  },
  'wire-strippers': {
    id: 'wire-strippers',
    name: 'Wire Strippers / Crimpers',
    category: 'Hand Tools',
    description: 'Strip insulation from wires, crimp connectors',
    essentialFor: ['electronics', 'automotive', 'appliances'],
    alternatives: ['Utility knife (less safe)', 'Needle-nose pliers (basic)'],
    avgPrice: 16.99,
    whereToBuy: {
      amazon: 'https://amazon.com/s?k=wire+strippers',
      homeDepot: 'https://www.homedepot.com/s/wire%2520strippers',
      localHardware: true,
    },
    rentalAvailable: false,
  },
};

/**
 * @openapi
 * /api/tools/catalog:
 *   get:
 *     summary: Get tool catalog
 *     description: Browse comprehensive tool database with purchase and rental options
 *     tags:
 *       - Tools
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: deviceCategory
 *         schema:
 *           type: string
 *       - in: query
 *         name: latitude
 *         schema:
 *           type: number
 *       - in: query
 *         name: longitude
 *         schema:
 *           type: number
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

    const category = searchParams.get('category');
    const deviceCategory = searchParams.get('deviceCategory');
    const latitude = parseFloat(searchParams.get('latitude') || '0');
    const longitude = parseFloat(searchParams.get('longitude') || '0');

    let tools = Object.values(TOOL_CATALOG);

    // Filter by tool category
    if (category) {
      tools = tools.filter((t) => t.category === category);
    }

    // Filter by device category (essential for)
    if (deviceCategory) {
      tools = tools.filter((t) => t.essentialFor.includes(deviceCategory));
    }

    // If location provided, find nearby tool libraries
    if (latitude && longitude) {
      const nearbyLibraries = await db.toolLibrary.findMany({
        where: {
          // Simple distance filter (can be optimized with PostGIS)
          latitude: {
            gte: latitude - 0.5,
            lte: latitude + 0.5,
          },
          longitude: {
            gte: longitude - 0.5,
            lte: longitude + 0.5,
          },
        },
        include: {
          tools: true,
        },
        take: 10,
      });

      // Add library information to tools
      tools = tools.map((tool) => {
        const librariesWithTool = nearbyLibraries
          .filter((lib) =>
            lib.tools.some((t) =>
              t.name.toLowerCase().includes(tool.name.toLowerCase())
            )
          )
          .map((lib) => {
            const distance = calculateDistance(
              latitude,
              longitude,
              lib.latitude,
              lib.longitude
            );

            const toolInLibrary = lib.tools.find((t) =>
              t.name.toLowerCase().includes(tool.name.toLowerCase())
            );

            return {
              id: lib.id,
              name: lib.name,
              distance: Math.round(distance * 10) / 10, // Round to 1 decimal
              available: toolInLibrary?.available || false,
            };
          })
          .sort((a, b) => a.distance - b.distance);

        return {
          ...tool,
          toolLibraries: librariesWithTool,
        };
      });
    }

    logger.info('Tool catalog accessed', {
      userId: user.id,
      category,
      deviceCategory,
      resultsCount: tools.length,
    });

    return NextResponse.json({
      tools,
      categories: [...new Set(tools.map((t) => t.category))],
      totalTools: tools.length,
    });
  } catch (error) {
    logger.error('Tool catalog failed', { error });

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to load tool catalog' },
      { status: 500 }
    );
  }
}

// Haversine formula for distance calculation
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}
