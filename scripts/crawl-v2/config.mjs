import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const allClinics = JSON.parse(fs.readFileSync(path.join(__dirname, '../../public/data/seoul_derma.json'), 'utf8'));

const NON_OFFICIAL_HOSTS = ['blog.naver.com', 'pf.kakao.com', 'instagram.com', 'blog.kakao.com', 'place.naver.com', 'naver.me', 'facebook.com', 'youtube.com', 'linktr.ee'];

function isCrawlable(c) {
  if (!c.homepage || !c.id) return false;
  if (c.homepage_status === 'no_official') return false;
  try {
    const host = new URL(c.homepage).hostname;
    return !NON_OFFICIAL_HOSTS.some(d => host.includes(d));
  } catch { return false; }
}

// All clinics with crawlable homepage, sorted by district then name
// Count how many locations each clinic name has
const nameCount = {};
for (const c of allClinics) nameCount[c.name] = (nameCount[c.name] || 0) + 1;

const withHomepage = allClinics
  .filter(isCrawlable)
  .map(c => ({
    hira_id: c.id,
    name: c.name,
    homepage: c.homepage,
    gu: c.gu,
    isChain: (nameCount[c.name] || 1) >= 2,
  }))
  .sort((a, b) => a.gu.localeCompare(b.gu, 'ko') || a.name.localeCompare(b.name, 'ko'));

/**
 * Get crawl targets for a specific district
 * Usage: getTargets('광진구') or getTargets() for all
 */
export function getTargets(gu) {
  if (gu) return withHomepage.filter(c => c.gu === gu);
  return withHomepage;
}

/**
 * List all districts with clinic counts
 */
export function listDistricts() {
  const map = {};
  for (const c of withHomepage) {
    map[c.gu] = (map[c.gu] || 0) + 1;
  }
  return Object.entries(map)
    .map(([gu, count]) => ({ gu, count }))
    .sort((a, b) => a.count - b.count);
}

// For backward compat — default to CLI arg
const guArg = process.argv.find(a => a.startsWith('--gu='))?.split('=')[1];
export const TARGETS = guArg ? getTargets(guArg) : withHomepage;
