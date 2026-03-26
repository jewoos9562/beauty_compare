/**
 * Phase 1: Raw Content Extraction
 * 홈페이지에서 모든 텍스트 + 이미지 텍스트 추출
 *
 * 핵심: 가격/시술 페이지를 우선 탐색하고, 탭/카테고리 구조를 감지하여
 * 쿼리 파라미터가 다른 페이지도 별도로 크롤링
 */

import * as cheerio from 'cheerio';
import Anthropic from '@anthropic-ai/sdk';
import puppeteer from 'puppeteer';
import { fetchPage, fetchImageAsBase64, delay, log } from './utils.mjs';

const anthropic = new Anthropic();

// ── 가격 관련 키워드 ──────────────────────────────────────────────
const HIGH_PRIORITY = ['product', 'price', '가격', 'event', '이벤트', '시술', '수가', '비급여', 'surgery', 'menu'];
const MED_PRIORITY = ['할인', '프로그램', 'program', '안내', 'service', 'treatment', '진료'];
const LOW_PRIORITY = ['community', 'notice', 'board', '후기', 'review', 'faq'];
const SKIP_PATTERNS = [/\.(jpg|jpeg|png|gif|svg|pdf|css|js|ico|woff|mp4|mp3)$/i, /\/(login|register|member|cart|order|mypage)\b/i];

function scoreLink(url, text) {
  const combined = (url + ' ' + (text || '')).toLowerCase();
  let score = 1;
  for (const kw of HIGH_PRIORITY) {
    if (combined.includes(kw)) score += 20;
  }
  for (const kw of MED_PRIORITY) {
    if (combined.includes(kw)) score += 5;
  }
  for (const kw of LOW_PRIORITY) {
    if (combined.includes(kw)) score += 2;
  }
  return score;
}

function shouldSkip(url) {
  return SKIP_PATTERNS.some(p => p.test(url));
}

// ── 링크 디스커버리 (쿼리 파라미터 포함) ─────────────────────────
export async function discoverLinks(baseUrl, maxPages = 100) {
  const origin = new URL(baseUrl).origin;
  const visited = new Set(); // full URL (쿼리 포함) 기준
  const visitedBase = new Set(); // 쿼리 제외 기준 (블로그 등 중복 방지)
  const toVisit = [{ url: baseUrl, depth: 0, score: 100, hasParams: false }];
  const discovered = [];

  // Try sitemap - 가격 관련 URL만 필터링
  try {
    const sitemapUrl = `${origin}/sitemap.xml`;
    const sitemapText = await fetchPage(sitemapUrl);
    const $ = cheerio.load(sitemapText, { xmlMode: true });
    let sitemapCount = 0;
    $('loc').each((_, el) => {
      const loc = $(el).text().trim();
      if (!loc.startsWith(origin)) return;
      const score = scoreLink(loc, '');
      // sitemap에서는 점수 높은 URL만 (가격/시술 관련)
      if (score >= 10) {
        toVisit.push({ url: loc, depth: 1, score, hasParams: loc.includes('?') });
        sitemapCount++;
      }
    });
    if (sitemapCount > 0) log('info', `Sitemap에서 가격 관련 ${sitemapCount}개 URL 발견`);
  } catch {
    // sitemap 없음
  }

  // 공통 가격 페이지 URL 패턴 직접 시도
  const commonPaths = [
    '/web/product', '/product', '/price', '/event', '/menu',
    '/시술안내', '/가격', '/이벤트', '/surgery', '/service',
    '/web/event', '/web/surgery', '/web/price',
  ];
  for (const path of commonPaths) {
    toVisit.push({ url: `${origin}${path}`, depth: 1, score: 50, hasParams: false });
  }

  while (toVisit.length > 0 && discovered.length < maxPages) {
    toVisit.sort((a, b) => b.score - a.score);
    const { url, depth, hasParams } = toVisit.shift();

    // URL 중복 체크: 파라미터가 있는 가격 페이지는 full URL로 체크
    const fullUrl = url;
    const baseOnly = url.split('?')[0];

    if (visited.has(fullUrl)) continue;
    if (!hasParams && visitedBase.has(baseOnly)) continue;

    visited.add(fullUrl);
    if (!hasParams) visitedBase.add(baseOnly);

    if (depth > 3) continue;
    if (shouldSkip(url)) continue;

    try {
      await delay(300);
      const html = await fetchPage(url);

      // 내용이 너무 적으면 스킵
      const textLength = cheerio.load(html)('body').text().replace(/\s+/g, ' ').trim().length;
      if (textLength < 30) continue;

      discovered.push({ url, html, depth });

      // 링크 추출
      const $ = cheerio.load(html);
      $('a[href]').each((_, el) => {
        let href = $(el).attr('href');
        if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) return;

        try {
          const resolved = new URL(href, url).href;
          if (!resolved.startsWith(origin)) return;

          const linkText = $(el).text().trim();
          const linkScore = scoreLink(resolved, linkText);
          const linkHasParams = resolved.includes('?');

          // 가격 페이지의 카테고리 탭은 항상 크롤링 (categoryId, cid, sField 등)
          const isPriceTab = /[?&](categoryId|cid|sField|category|cat|page_id)=/i.test(resolved);

          if (isPriceTab) {
            // 가격 탭은 full URL로 관리 (중복 방지는 full URL 기준)
            if (!visited.has(resolved)) {
              toVisit.push({ url: resolved, depth: depth + 1, score: linkScore + 30, hasParams: true });
            }
          } else {
            toVisit.push({ url: resolved, depth: depth + 1, score: linkScore, hasParams: linkHasParams });
          }
        } catch {}
      });
    } catch (e) {
      // 접근 실패는 조용히 스킵
    }
  }

  log('info', `${discovered.length}개 페이지 크롤링 완료`);
  return discovered;
}

// ── HTML 텍스트 추출 ─────────────────────────────────────────────
export function extractTextFromHTML(html, url) {
  const $ = cheerio.load(html);

  // 불필요한 요소 제거
  $('script, style, nav, footer, header, iframe, noscript, .gnb, .lnb').remove();

  // 테이블 구조 보존
  const tables = [];
  $('table').each((_, table) => {
    const rows = [];
    $(table).find('tr').each((_, tr) => {
      const cells = [];
      $(tr).find('td, th').each((_, cell) => {
        cells.push($(cell).text().trim());
      });
      if (cells.some(c => c)) rows.push(cells.join(' | '));
    });
    if (rows.length > 0) tables.push(rows.join('\n'));
  });

  // 가격 관련 리스트 구조 보존 (.listBox, .surgeryList, .priceList 등)
  const priceBlocks = [];
  $('.listBox, .surgeryList, .priceList, .eventList, .productList, [class*="price"], [class*="product"], [class*="surgery"]').each((_, block) => {
    const blockText = $(block).text().replace(/\s+/g, ' ').trim();
    if (blockText.length > 20) priceBlocks.push(blockText);
  });

  // 전체 텍스트
  const bodyText = $('body').text().replace(/\s+/g, ' ').trim();

  // 가격 관련 이미지 후보
  const images = [];
  $('img[src]').each((_, img) => {
    const src = $(img).attr('src');
    const alt = $(img).attr('alt') || '';
    if (!src) return;

    let absoluteSrc;
    try {
      absoluteSrc = new URL(src, url).href;
    } catch { return; }

    const combined = (absoluteSrc + ' ' + alt).toLowerCase();
    const isPriceImage = /event|price|가격|이벤트|menu|시술|할인|배너|banner|evt|popup/.test(combined);
    const isSmallIcon = /icon|logo|arrow|btn|button|favicon|\.svg/.test(combined);

    if (isPriceImage && !isSmallIcon) {
      images.push({ url: absoluteSrc, alt, context: $(img).parent().text().trim().slice(0, 100) });
    }
  });

  return {
    text: bodyText,
    tables,
    priceBlocks,
    images,
  };
}

// ── VLM 이미지 OCR ──────────────────────────────────────────────
export async function extractTextFromImages(imageInfos, maxImages = 30) {
  if (imageInfos.length === 0) return [];

  const seen = new Set();
  const unique = imageInfos.filter(img => {
    if (seen.has(img.url)) return false;
    seen.add(img.url);
    return true;
  }).slice(0, maxImages);

  log('info', `${unique.length}개 이미지 VLM 분석 시작`);

  const results = [];
  const batchSize = 5;

  for (let i = 0; i < unique.length; i += batchSize) {
    const batch = unique.slice(i, i + batchSize);
    log('info', `  이미지 배치 ${i + 1}-${Math.min(i + batchSize, unique.length)}/${unique.length}`);

    const content = [];
    for (const img of batch) {
      try {
        const { base64, mediaType } = await fetchImageAsBase64(img.url);
        content.push({
          type: 'image',
          source: { type: 'base64', media_type: mediaType, data: base64 },
        });
      } catch (e) {
        log('warn', `  이미지 다운로드 실패: ${img.url} (${e.message})`);
      }
    }

    if (content.length === 0) continue;

    content.push({
      type: 'text',
      text: `이 이미지들은 한국 피부과/성형외과의 가격 관련 페이지입니다.
각 이미지에서 보이는 모든 텍스트를 그대로 추출해주세요.
특히 시술명, 가격, 단위, 카테고리 정보에 주의해주세요.

규칙:
- 이미지에 보이는 텍스트를 최대한 정확하게 전사
- 가격은 숫자와 원/만원 단위 포함
- 취소선 가격도 "(취소선)" 표시하여 포함
- 테이블 형태는 행별로 구분하여 출력
- 텍스트가 없거나 가격 정보가 없는 이미지는 무시`,
    });

    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [{ role: 'user', content }],
      });

      const text = response.content[0].text.trim();
      results.push({
        sourceUrls: batch.map(b => b.url),
        rawText: text,
      });
    } catch (e) {
      log('warn', `  VLM 분석 실패: ${e.message}`);
    }

    await delay(1000);
  }

  return results;
}

// ── Puppeteer 팝업 슬라이드 캡처 ─────────────────────────────────
export async function capturePopupSlides(baseUrl, options = {}) {
  const { timeout = 15000 } = options;
  log('info', `Puppeteer 팝업 캡처 시작: ${baseUrl}`);

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });

    await page.goto(baseUrl, { waitUntil: 'networkidle2', timeout });
    await delay(3000);

    // ── Strategy 1: multiPopup 구조 (bannerButton + imgCell) ──
    const popupData = await page.evaluate(() => {
      const popup = document.querySelector('#multiPopup');
      if (!popup) return null;

      const buttons = [...popup.querySelectorAll('.bannerButton')];
      const images = [...popup.querySelectorAll('.imgCell img[data-src], .imgCell img[src]')];
      // 마지막 이미지는 종종 진료시간 등 (src만 있고 data-src 없는 것)
      const allImgs = [...popup.querySelectorAll('.imgCell a img, .imgCell > img')];

      return {
        type: 'multiPopup',
        buttonTexts: buttons.map(b => b.textContent.trim()),
        buttonCount: buttons.length,
        imageUrls: allImgs.map(img => img.getAttribute('data-src') || img.getAttribute('src')).filter(Boolean),
        imageCount: allImgs.length,
      };
    });

    if (popupData && popupData.buttonCount > 0) {
      log('info', `  multiPopup 감지: ${popupData.buttonCount}개 탭, ${popupData.imageCount}개 이미지`);

      const origin = new URL(baseUrl).origin;
      const screenshots = [];

      // 이미지 URL을 직접 다운로드 → base64 변환 (스크린샷보다 정확)
      for (let i = 0; i < popupData.imageUrls.length; i++) {
        try {
          let imgUrl = popupData.imageUrls[i];
          if (imgUrl.startsWith('/')) imgUrl = origin + imgUrl;

          const { base64, mediaType } = await fetchImageAsBase64(imgUrl);
          const tabText = popupData.buttonTexts[i] || `slide_${i}`;

          screenshots.push({ tabText, base64, mediaType });
          log('info', `  이미지 ${i + 1}/${popupData.imageUrls.length}: "${tabText.slice(0, 40)}"`);
        } catch (e) {
          log('warn', `  이미지 ${i + 1} 다운로드 실패: ${e.message}`);
        }
      }

      log('info', `  팝업 이미지 ${screenshots.length}개 다운로드 완료`);
      return screenshots;
    }

    // ── Strategy 2: Generic 팝업/모달 감지 ──
    const genericPopup = await page.evaluate(() => {
      const candidates = document.querySelectorAll('div, section');
      for (const el of candidates) {
        const style = window.getComputedStyle(el);
        const zIndex = parseInt(style.zIndex) || 0;
        const isVisible = style.display !== 'none' && style.visibility !== 'hidden' && parseFloat(style.opacity) > 0;
        const isOverlay = zIndex > 100 || style.position === 'fixed';
        const hasSize = el.offsetWidth > 300 && el.offsetHeight > 300;
        const classId = (el.className + ' ' + el.id).toLowerCase();

        if (isVisible && isOverlay && hasSize && /popup|pop|layer|modal|event|banner/.test(classId)) {
          return el.id ? `#${el.id}` : `.${el.className.split(' ')[0]}`;
        }
      }
      return null;
    });

    if (genericPopup) {
      log('info', `  Generic 팝업 발견: ${genericPopup}`);
      const el = await page.$(genericPopup);
      if (el) {
        const screenshot = await el.screenshot({ encoding: 'base64' });
        return [{ tabText: 'popup', base64: screenshot, mediaType: 'image/png' }];
      }
    }

    log('warn', '  팝업을 찾을 수 없음');
    return [];
  } catch (e) {
    log('warn', `Puppeteer 팝업 캡처 실패: ${e.message}`);
    return [];
  } finally {
    if (browser) await browser.close();
  }
}

// ── 팝업 스크린샷 VLM OCR ────────────────────────────────────────
export async function ocrPopupScreenshots(screenshots) {
  if (screenshots.length === 0) return [];

  const anthropic = new Anthropic();
  const results = [];
  const batchSize = 3; // 팝업 이미지는 큰 편이므로 배치 작게

  for (let i = 0; i < screenshots.length; i += batchSize) {
    const batch = screenshots.slice(i, i + batchSize);
    log('info', `  팝업 OCR 배치 ${i + 1}-${Math.min(i + batchSize, screenshots.length)}/${screenshots.length}`);

    const content = [];
    for (const shot of batch) {
      content.push({
        type: 'image',
        source: { type: 'base64', media_type: shot.mediaType, data: shot.base64 },
      });
    }

    content.push({
      type: 'text',
      text: `이 이미지들은 한국 피부과/성형외과의 팝업 이벤트 배너입니다.
각 이미지에서 보이는 모든 텍스트를 그대로 추출해주세요.
특히 시술명, 가격, 단위(cc, 샷, 바이알 등), 할인율, 조건(VAT별도 등)에 주의해주세요.

규칙:
- 이미지에 보이는 텍스트를 최대한 정확하게 전사
- 가격은 숫자와 원/만원 단위 포함
- 취소선 가격도 "(취소선)" 표시하여 포함
- 조건(10cc이상시, VAT별도 등)도 반드시 포함
- 시술명이 없거나 가격 정보가 없는 이미지는 "가격정보없음"으로 표시`,
    });

    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [{ role: 'user', content }],
      });

      const text = response.content[0].text.trim();
      results.push({
        tabTexts: batch.map(b => b.tabText),
        rawText: text,
      });
    } catch (e) {
      log('warn', `  팝업 OCR 실패: ${e.message}`);
    }

    await delay(1000);
  }

  return results;
}

// ── Phase 1 오케스트레이터 ──────────────────────────────────────
export async function phase1Extract(url, options = {}) {
  const { maxPages = 100, maxImages = 30 } = options;
  const startTime = Date.now();

  log('info', `Phase 1 시작: ${url}`);

  // 1. 링크 디스커버리 & 페이지 크롤링
  const pages = await discoverLinks(url, maxPages);

  // 2. 각 페이지에서 텍스트 + 이미지 추출
  const allText = [];
  const allImages = [];

  for (const page of pages) {
    const { text, tables, priceBlocks, images } = extractTextFromHTML(page.html, page.url);

    // 가격 블록이 있으면 우선 포함
    if (priceBlocks && priceBlocks.length > 0) {
      allText.push(`\n=== PRICE BLOCKS from ${page.url} ===\n${priceBlocks.join('\n---\n')}`);
    } else if (text.length > 50) {
      allText.push(`\n=== PAGE: ${page.url} ===\n${text}`);
    }

    if (tables.length > 0) {
      allText.push(`\n=== TABLES from ${page.url} ===\n${tables.join('\n---\n')}`);
    }
    allImages.push(...images);
  }

  // 3. 이미지 OCR (VLM)
  let imageTexts = [];
  if (allImages.length > 0 && process.env.ANTHROPIC_API_KEY) {
    imageTexts = await extractTextFromImages(allImages, maxImages);
    for (const it of imageTexts) {
      allText.push(`\n=== IMAGE OCR ===\n${it.rawText}`);
    }
  } else if (allImages.length > 0) {
    log('warn', 'ANTHROPIC_API_KEY 없음 - 이미지 OCR 건너뜀');
  }

  // 4. Puppeteer 팝업 캡처 + OCR
  let popupTexts = [];
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const popupShots = await capturePopupSlides(url);
      if (popupShots.length > 0) {
        popupTexts = await ocrPopupScreenshots(popupShots);
        for (const pt of popupTexts) {
          allText.push(`\n=== POPUP EVENT (${pt.tabTexts.join(', ')}) ===\n${pt.rawText}`);
        }
        log('success', `팝업 ${popupShots.length}개 슬라이드에서 ${popupTexts.length}개 OCR 결과`);
      }
    } catch (e) {
      log('warn', `팝업 캡처 단계 실패 (non-fatal): ${e.message}`);
    }
  }

  const combinedText = allText.join('\n');
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  log('success', `Phase 1 완료: ${pages.length}페이지, ${allImages.length}이미지 후보, ${duration}초`);
  log('info', `  추출된 텍스트: ${combinedText.length}자`);

  return {
    combinedText,
    pages: pages.map(p => p.url),
    imageCount: allImages.length,
    imageTexts,
    duration,
  };
}
