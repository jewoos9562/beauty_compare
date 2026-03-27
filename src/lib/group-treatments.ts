export type Item = {
  name: string;
  orig: number | null;
  event: number | null;
  base?: number | null;
  volume_or_count?: string | null;
  area?: string | null;
};

export type ParsedTreatment = {
  baseName: string;
  quantity: number | null;
  unit: string | null;
  isSet: boolean;
  rawName: string;
};

export type GroupedCategory = {
  singles: Item[];
  groups: {
    baseName: string;
    items: (Item & { quantity: number | null; unit: string | null })[];
  }[];
  sets: Item[];
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
  const isSet = detectSet(name);

  const matches = findAllQuantityMatches(name);

  if (matches.length === 0) {
    return {
      baseName: name.trim(),
      quantity: null,
      unit: null,
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
    quantity: lastMatch.quantity,
    unit: lastMatch.unit,
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
  const sets: Item[] = [];
  const byGroupKey = new Map<
    string,
    { displayName: string; items: (Item & { quantity: number | null; unit: string | null })[] }
  >();

  for (const item of items) {
    const parsed = parseTreatment(item.name);

    if (parsed.isSet) {
      sets.push(item);
      continue;
    }

    // Use volume_or_count field if quantity not found in name
    let quantity = parsed.quantity;
    let unit = parsed.unit;
    if (quantity === null && item.volume_or_count) {
      const volParsed = findAllQuantityMatches(item.volume_or_count);
      if (volParsed.length > 0) {
        quantity = volParsed[0].quantity;
        unit = volParsed[0].unit;
      }
    }

    const groupKey = normalizeForGrouping(parsed.baseName);
    const enriched = { ...item, quantity, unit };
    const existing = byGroupKey.get(groupKey);
    if (existing) {
      existing.items.push(enriched);
    } else {
      byGroupKey.set(groupKey, { displayName: groupKey, items: [enriched] });
    }
  }

  const singles: Item[] = [];
  const groups: {
    baseName: string;
    items: (Item & { quantity: number | null; unit: string | null })[];
  }[] = [];

  for (const [, group] of byGroupKey) {
    if (group.items.length === 1) {
      singles.push(group.items[0]);
    } else {
      // Sort items by quantity ascending, then by price ascending
      group.items.sort((a, b) => {
        // First by quantity
        if (a.quantity !== null || b.quantity !== null) {
          if (a.quantity === null) return -1;
          if (b.quantity === null) return 1;
          if (a.quantity !== b.quantity) return a.quantity - b.quantity;
        }
        // Then by price
        const priceA = a.event ?? a.orig ?? Infinity;
        const priceB = b.event ?? b.orig ?? Infinity;
        return priceA - priceB;
      });
      groups.push({ baseName: group.displayName, items: group.items });
    }
  }

  // Sort groups alphabetically by baseName
  groups.sort((a, b) => a.baseName.localeCompare(b.baseName));

  // Sort singles by name, then price
  singles.sort((a, b) => {
    const cmp = a.name.localeCompare(b.name);
    if (cmp !== 0) return cmp;
    const priceA = a.event ?? a.orig ?? Infinity;
    const priceB = b.event ?? b.orig ?? Infinity;
    return priceA - priceB;
  });

  return { singles, groups, sets };
}
