export type Item = {
  name: string;
  orig: number | null;
  event: number | null;
  base?: number | null;
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
 * Group treatment items by their base treatment name.
 */
export function groupItems(items: Item[]): GroupedCategory {
  const sets: Item[] = [];
  const byBaseName = new Map<
    string,
    (Item & { quantity: number | null; unit: string | null })[]
  >();

  for (const item of items) {
    const parsed = parseTreatment(item.name);

    if (parsed.isSet) {
      sets.push(item);
      continue;
    }

    const enriched = { ...item, quantity: parsed.quantity, unit: parsed.unit };
    const group = byBaseName.get(parsed.baseName);
    if (group) {
      group.push(enriched);
    } else {
      byBaseName.set(parsed.baseName, [enriched]);
    }
  }

  const singles: Item[] = [];
  const groups: {
    baseName: string;
    items: (Item & { quantity: number | null; unit: string | null })[];
  }[] = [];

  for (const [baseName, groupItems] of byBaseName) {
    if (groupItems.length === 1) {
      singles.push(groupItems[0]);
    } else {
      // Sort items by quantity ascending (nulls first)
      groupItems.sort((a, b) => {
        if (a.quantity === null && b.quantity === null) return 0;
        if (a.quantity === null) return -1;
        if (b.quantity === null) return -1;
        return a.quantity - b.quantity;
      });
      groups.push({ baseName, items: groupItems });
    }
  }

  // Sort groups alphabetically by baseName
  groups.sort((a, b) => a.baseName.localeCompare(b.baseName));

  // Sort singles by name
  singles.sort((a, b) => a.name.localeCompare(b.name));

  return { singles, groups, sets };
}
