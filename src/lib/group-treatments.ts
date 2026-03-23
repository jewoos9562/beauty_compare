import CANONICAL from '@/data/treatment-canonical.json';

type CanonicalEntry = {
  treatmentName: string | null;
  quantity: number | null;
  unit: string | null;
  bodyPart: string | null;
  feature: string | null;
  origin: string | null;
  confidence: string;
};

const canonicalEntries = (CANONICAL as { entries: Record<string, CanonicalEntry> }).entries;

function lookupCanonical(rawName: string): CanonicalEntry | null {
  const entry = canonicalEntries[rawName];
  if (!entry || entry.confidence === 'low') return null;
  return entry;
}

function buildBaseName(entry: CanonicalEntry): string {
  const parts: string[] = [];
  if (entry.bodyPart) parts.push(entry.bodyPart);
  if (entry.treatmentName) parts.push(entry.treatmentName);
  if (entry.origin) parts.push(`(${entry.origin})`);
  return parts.join(' ').trim();
}

export type Item = {
  name: string;
  orig: number | null;
  event: number | null;
  base?: number | null;
};

export type ParsedTreatment = {
  baseName: string;
  displayName: string | null;
  quantity: number | null;
  unit: string | null;
  bodyPart: string | null;
  origin: string | null;
  isSet: boolean;
  rawName: string;
  feature?: string | null;
};

export type EnrichedItem = Item & {
  quantity: number | null;
  unit: string | null;
  feature: string | null;
  displayName: string | null;
  bodyPart: string | null;
  origin: string | null;
};

export type GroupedCategory = {
  singles: EnrichedItem[];
  groups: { baseName: string; items: EnrichedItem[] }[];
  sets: EnrichedItem[];
};

/**
 * Quantity+unit patterns in order of matching priority.
 * Each entry: [regex, unit string, multiplier]
 */
const QUANTITY_PATTERNS: [RegExp, string, number][] = [
  [/(\d+)\s*만줄/, '줄', 10000],
  [/(\d+)\s*KJ/i, 'KJ', 1],
  [/(\d+)\s*샷/, '샷', 1],
  [/(\d+)\s*cc/i, 'cc', 1],
  [/(\d+)\s*회/, '회', 1],
  [/(\d+)\s*vial/i, 'vial', 1],
  [/(\d+)\s*바이알/, '바이알', 1],
  [/(\d+)\s*시린지/, '시린지', 1],
  [/(\d+)\s*U\b/, 'U', 1],
  [/(\d+)\s*줄/, '줄', 1],
  [/(\d+)\s*유닛/, '유닛', 1],
];

/**
 * Find all quantity+unit matches in a string, returning them with their
 * position info so we can identify the last one.
 */
function findAllQuantityMatches(
  name: string
): { index: number; length: number; quantity: number; unit: string }[] {
  const matches: {
    index: number;
    length: number;
    quantity: number;
    unit: string;
  }[] = [];

  for (const [pattern, unit, multiplier] of QUANTITY_PATTERNS) {
    // Use a global copy to find all occurrences
    const globalPattern = new RegExp(pattern.source, pattern.flags + 'g');
    let m: RegExpExecArray | null;
    while ((m = globalPattern.exec(name)) !== null) {
      // Check this position hasn't already been claimed by a higher-priority pattern
      const alreadyCovered = matches.some(
        (existing) =>
          m!.index >= existing.index &&
          m!.index < existing.index + existing.length
      );
      if (!alreadyCovered) {
        matches.push({
          index: m.index,
          length: m[0].length,
          quantity: parseInt(m[1], 10) * multiplier,
          unit,
        });
      }
    }
  }

  // Sort by position in string
  matches.sort((a, b) => a.index - b.index);
  return matches;
}

/**
 * Detect whether a name represents a set/combo menu.
 * A set contains '+' used as a separator between treatments,
 * but not as part of a product name like "HB+", "V+", "C+", etc.
 */
function detectSet(name: string): boolean {
  // Remove known product suffixes that include '+'
  // e.g. "HB+", "V+", "C+" etc. — typically a short alphanum token ending with +
  const cleaned = name.replace(/[A-Za-z가-힣0-9]+\+(?!\s*[가-힣A-Za-z])/g, '');
  // Now check if there's still a '+' acting as a separator
  // Pattern: something + something (with optional spaces)
  return /[가-힣A-Za-z0-9)]\s*\+\s*[가-힣A-Za-z(]/.test(cleaned);
}

/**
 * Parse a treatment name to extract base name, quantity, unit, and set status.
 */
export function parseTreatment(name: string): ParsedTreatment {
  // Fast path: canonical lookup
  const canonical = lookupCanonical(name);
  if (canonical?.treatmentName) {
    return {
      baseName: buildBaseName(canonical),
      displayName: canonical.treatmentName,
      quantity: canonical.quantity,
      unit: canonical.unit,
      bodyPart: canonical.bodyPart,
      origin: canonical.origin,
      isSet: false,
      rawName: name,
      feature: canonical.feature,
    };
  }

  const isSet = detectSet(name);

  const matches = findAllQuantityMatches(name);

  if (matches.length === 0) {
    return {
      baseName: name.trim(),
      displayName: null,
      quantity: null,
      unit: null,
      bodyPart: null,
      origin: null,
      isSet,
      rawName: name,
    };
  }

  // The grouping quantity is the LAST match in the string.
  // Earlier matches are considered part of the product spec.
  const lastMatch = matches[matches.length - 1];

  // Remove the last quantity+unit pattern from the name to form baseName
  const before = name.slice(0, lastMatch.index);
  const after = name.slice(lastMatch.index + lastMatch.length);
  const baseName = (before + after).replace(/\s+/g, ' ').trim();

  return {
    baseName,
    displayName: null,
    quantity: lastMatch.quantity,
    unit: lastMatch.unit,
    bodyPart: null,
    origin: null,
    isSet,
    rawName: name,
  };
}

/**
 * Normalize a baseName for grouping purposes:
 * - Remove price tags like (체험가), (한정가), (타임세일), (체험), (정가)
 * - Collapse whitespace
 * - Normalize spacing in known compound brand names
 */
function normalizeForGrouping(baseName: string): string {
  let n = baseName;
  // Remove price/promo suffixes in parens
  n = n.replace(/\s*\((체험가|한정가|타임세일|체험|정가|한정)\)\s*/g, '');
  // Normalize known brand compounds: collapse spaces
  // e.g., "울쎄라피 프라임" and "울쎄라피프라임" should match
  const BRAND_COMPOUNDS = [
    '울쎄라피프라임', '울쎄라피 프라임',
    '슈링크유니버스', '슈링크 유니버스',
    '피코슈어토닝', '피코슈어 토닝',
    '포토나토닝', '포토나 토닝',
    '바디인모드', '바디 인모드',
    '바디온다리프팅', '바디 온다 리프팅',
    '인모드FX', '인모드 FX',
    '제네시스토닝', '제네시스 토닝',
  ];
  // Collapse all spaces for comparison
  const collapsed = n.replace(/\s+/g, '');
  // Find the canonical (spaced) form for known compounds
  for (let i = 0; i < BRAND_COMPOUNDS.length; i += 2) {
    const noSpace = BRAND_COMPOUNDS[i];
    const withSpace = BRAND_COMPOUNDS[i + 1];
    if (collapsed.startsWith(noSpace.replace(/\s+/g, ''))) {
      const rest = collapsed.slice(noSpace.replace(/\s+/g, '').length);
      n = withSpace + (rest ? ' ' + rest : '');
      break;
    }
  }
  return n.replace(/\s+/g, ' ').trim();
}

/**
 * Group treatment items by their base treatment name.
 */
export function groupItems(items: Item[]): GroupedCategory {
  const sets: EnrichedItem[] = [];
  const byGroupKey = new Map<string, { displayName: string; items: EnrichedItem[] }>();

  for (const item of items) {
    const parsed = parseTreatment(item.name);

    if (parsed.isSet) {
      sets.push({ ...item, quantity: null, unit: null, feature: parsed.feature ?? null, displayName: parsed.displayName, bodyPart: parsed.bodyPart, origin: parsed.origin });
      continue;
    }

    const groupKey = normalizeForGrouping(parsed.baseName);
    const enriched: EnrichedItem = {
      ...item,
      quantity: parsed.quantity,
      unit: parsed.unit,
      feature: parsed.feature ?? null,
      displayName: parsed.displayName,
      bodyPart: parsed.bodyPart,
      origin: parsed.origin,
    };
    const existing = byGroupKey.get(groupKey);
    if (existing) {
      existing.items.push(enriched);
    } else {
      byGroupKey.set(groupKey, { displayName: groupKey, items: [enriched] });
    }
  }

  const singles: EnrichedItem[] = [];
  const groups: { baseName: string; items: EnrichedItem[] }[] = [];

  for (const [, group] of byGroupKey) {
    if (group.items.length === 1) {
      singles.push(group.items[0]);
    } else {
      // Sort items by quantity ascending (nulls first)
      group.items.sort((a, b) => {
        if (a.quantity === null && b.quantity === null) return 0;
        if (a.quantity === null) return -1;
        if (b.quantity === null) return -1;
        return a.quantity - b.quantity;
      });
      groups.push({ baseName: group.displayName, items: group.items });
    }
  }

  // Sort groups alphabetically by baseName
  groups.sort((a, b) => a.baseName.localeCompare(b.baseName));

  // Sort singles by name
  singles.sort((a, b) => a.name.localeCompare(b.name));

  return { singles, groups, sets };
}
