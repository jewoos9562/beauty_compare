/**
 * 공통 유틸리티
 */

const MOBILE_UA = 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

export async function fetchPage(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': MOBILE_UA,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'ko-KR,ko;q=0.9',
        },
        redirect: 'follow',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
}

export async function fetchImageAsBase64(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': MOBILE_UA },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = await res.arrayBuffer();
  const contentType = res.headers.get('content-type') || 'image/png';
  const mediaType = contentType.split(';')[0].trim();
  return {
    base64: Buffer.from(buf).toString('base64'),
    mediaType,
  };
}

export function parsePrice(text) {
  if (!text) return null;
  // "35만원" → 350000, "9,900원" → 9900
  let cleaned = text.replace(/,/g, '').replace(/\s/g, '');
  const manMatch = cleaned.match(/(\d+(?:\.\d+)?)\s*만\s*원?/);
  if (manMatch) return Math.round(parseFloat(manMatch[1]) * 10000);
  const numMatch = cleaned.match(/(\d+)/);
  return numMatch ? parseInt(numMatch[1], 10) : null;
}

export function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

export function log(level, ...args) {
  const ts = new Date().toISOString().slice(11, 19);
  const prefix = { info: '📋', warn: '⚠️', error: '❌', success: '✅' }[level] || '  ';
  console.log(`[${ts}] ${prefix}`, ...args);
}

/** 텍스트를 대략적으로 토큰 수 기준으로 청크 분할 (1 token ≈ 3.5 chars for Korean) */
export function chunkText(text, maxChars = 12000) {
  if (text.length <= maxChars) return [text];
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    let end = start + maxChars;
    // 줄바꿈 기준으로 자르기
    if (end < text.length) {
      const newline = text.lastIndexOf('\n', end);
      if (newline > start + maxChars / 2) end = newline;
    }
    chunks.push(text.slice(start, end));
    start = end;
  }
  return chunks;
}
