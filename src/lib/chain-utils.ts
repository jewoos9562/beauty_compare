/**
 * Chain clinic utilities
 *
 * site_type:
 *   'independent' — 지점 전용 도메인/경로. 이미지 전부 "지점", 공통 0
 *   'unified'     — 통합 사이트, 지점 구분 없음. 이미지 전부 "공통", 지점 0
 *   'mixed'       — 지점 경로 + 공통 페이지 섞임. URL로 분류
 */

export type SiteType = 'independent' | 'unified' | 'mixed';

export function classifySourceUrl(
  sourceUrl: string,
  homepage: string,
  siteType?: SiteType,
): 'branch' | 'common' {
  if (!siteType || siteType === 'independent') return 'branch';
  if (siteType === 'unified') return 'common';

  // mixed: check if URL contains branch-specific path segment
  if (!homepage || !sourceUrl) return 'common';
  try {
    const homePath = new URL(homepage).pathname.replace(/\/$/, '');
    const branchSegment = homePath.split('/').filter(Boolean).pop() || '';
    if (branchSegment && branchSegment.length > 2 && sourceUrl.includes(branchSegment)) {
      return 'branch';
    }
    return 'common';
  } catch {
    return 'common';
  }
}
