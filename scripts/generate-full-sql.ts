/**
 * 스키마 + 시드 데이터를 하나의 SQL 파일로 생성
 * 실행: npx tsx scripts/generate-full-sql.ts
 */
import fs from 'fs';
import path from 'path';
import { CLINICS, CROSS_KEYWORDS } from '../src/data/clinics';

function esc(s: string | null | undefined): string {
  if (s == null) return 'NULL';
  return `'${s.replace(/'/g, "''")}'`;
}

function num(n: number | null | undefined): string {
  if (n == null) return 'NULL';
  return String(n);
}

let sql = '';

// Schema
sql += fs.readFileSync(path.join(__dirname, '..', 'supabase-schema.sql'), 'utf-8');
sql += '\n\n-- =============================================\n';
sql += '-- SEED DATA\n';
sql += '-- =============================================\n\n';

// District
sql += `INSERT INTO districts (id, name, active) VALUES ('gwangjin', '광진구', true) ON CONFLICT (id) DO NOTHING;\n\n`;

// Clinics
for (const clinic of CLINICS) {
  sql += `INSERT INTO clinics (id, district_id, name, address, phone, note, color) VALUES (${esc(clinic.id)}, 'gwangjin', ${esc(clinic.name)}, ${esc(clinic.address)}, ${esc(clinic.phone)}, ${esc(clinic.note)}, ${esc(clinic.color)}) ON CONFLICT (id) DO NOTHING;\n`;
}
sql += '\n';

// Categories + Treatments (use a DO block with variables)
sql += `DO $$\nDECLARE\n  cat_id INT;\nBEGIN\n`;

for (const clinic of CLINICS) {
  for (let ci = 0; ci < clinic.categories.length; ci++) {
    const cat = clinic.categories[ci];
    sql += `  INSERT INTO categories (clinic_id, name, tag, sort_order) VALUES (${esc(clinic.id)}, ${esc(cat.name)}, ${esc(cat.tag)}, ${ci}) RETURNING id INTO cat_id;\n`;

    for (let ti = 0; ti < cat.items.length; ti++) {
      const item = cat.items[ti];
      sql += `  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, ${esc(item.name)}, ${num(item.orig)}, ${num(item.event)}, ${num(item.base)}, ${ti});\n`;
    }
    sql += '\n';
  }
}

sql += `END $$;\n\n`;

// Cross keywords
sql += `-- Cross comparison keywords\n`;
for (const kw of CROSS_KEYWORDS) {
  const kwArr = `ARRAY[${kw.keywords.map(k => esc(k)).join(',')}]`;
  sql += `INSERT INTO cross_keywords (label, keywords) VALUES (${esc(kw.label)}, ${kwArr});\n`;
}

// Write
const outPath = path.join(__dirname, '..', 'supabase-full-setup.sql');
fs.writeFileSync(outPath, sql, 'utf-8');
console.log(`✅ Generated: supabase-full-setup.sql (${(sql.length / 1024).toFixed(1)} KB)`);
console.log(`총 ${CLINICS.length}개 병원, ${CLINICS.reduce((a, c) => a + c.categories.length, 0)}개 카테고리, ${CLINICS.reduce((a, c) => a + c.categories.reduce((b, cat) => b + cat.items.length, 0), 0)}개 시술 항목`);
