import type { Lang } from './translations';

type GlossaryEntry = { ko: string; en: string; es: string; ja: string; zh: string };

const GLOSSARY: GlossaryEntry[] = [
  // Medical/Treatment terms
  { ko: '스킨부스터', en: 'Skin Booster', es: 'Skin Booster', ja: 'スキンブースター', zh: '水光针' },
  { ko: '스킨부스팅', en: 'Skin Boosting', es: 'Skin Boosting', ja: 'スキンブースティング', zh: '皮肤管理' },
  { ko: '스킨바이브', en: 'SkinVive', es: 'SkinVive', ja: 'スキンバイブ', zh: 'SkinVive' },
  { ko: '스킨톡신', en: 'Skin Toxin', es: 'Skin Toxin', ja: 'スキントキシン', zh: '皮肤毒素' },
  { ko: '주름보톡스', en: 'Wrinkle Botox', es: 'Bótox Antiarrugas', ja: 'シワボトックス', zh: '除皱肉毒素' },
  { ko: '턱보톡스', en: 'Jaw Botox', es: 'Bótox Mandíbula', ja: '顎ボトックス', zh: '瘦脸肉毒素' },
  { ko: '윤곽주사', en: 'Contour Injection', es: 'Inyección de Contorno', ja: '輪郭注射', zh: '溶脂针' },
  { ko: '페이스온다', en: 'Face Onda', es: 'Face Onda', ja: 'フェイスオンダ', zh: 'Face Onda' },
  { ko: '울쎄라피', en: 'Ultherapy', es: 'Ultherapy', ja: 'ウルセラピー', zh: '超声刀' },
  { ko: '건대입구', en: 'Konkuk Univ.', es: 'Konkuk Univ.', ja: '建大入口', zh: '建大入口' },
  { ko: '아쿠아필', en: 'Aqua Peel', es: 'Aqua Peel', ja: 'アクアピール', zh: '水光清洁' },
  { ko: '볼뉴머', en: 'Volnewmer', es: 'Volnewmer', ja: 'ボルニューマー', zh: 'Volnewmer' },
  { ko: '리프테라', en: 'Liftera', es: 'Liftera', ja: 'リフテラ', zh: 'Liftera' },
  { ko: '코어톡스', en: 'Coretox', es: 'Coretox', ja: 'コアトックス', zh: 'Coretox' },
  { ko: '보톡스', en: 'Botox', es: 'Bótox', ja: 'ボトックス', zh: '肉毒素' },
  { ko: '쥬베룩', en: 'Juvelook', es: 'Juvelook', ja: 'ジュベルック', zh: 'Juvelook' },
  { ko: '리쥬란', en: 'Rejuran', es: 'Rejuran', ja: 'リジュラン', zh: '婴儿针' },
  { ko: '포텐자', en: 'Potenza', es: 'Potenza', ja: 'ポテンツァ', zh: 'Potenza' },
  { ko: '울쎄라', en: 'Ulthera', es: 'Ulthera', ja: 'ウルセラ', zh: '超声刀' },
  { ko: '써마지', en: 'Thermage', es: 'Thermage', ja: 'サーマジ', zh: '热玛吉' },
  { ko: '리프팅', en: 'Lifting', es: 'Lifting', ja: 'リフティング', zh: '提升' },
  { ko: '슈링크', en: 'Shurink', es: 'Shurink', ja: 'シュリンク', zh: '热拉提' },
  { ko: '인모드', en: 'InMode', es: 'InMode', ja: 'インモード', zh: 'InMode' },
  { ko: '레이저', en: 'Laser', es: 'Láser', ja: 'レーザー', zh: '激光' },
  { ko: '레티젠', en: 'Lethigen', es: 'Lethigen', ja: 'レチゲン', zh: 'Lethigen' },
  { ko: '모델링', en: 'Modeling Pack', es: 'Mascarilla Modeling', ja: 'モデリング', zh: '建模面膜' },
  { ko: '펌핑팁', en: 'Pumping Tip', es: 'Punta Pumping', ja: 'パンピングチップ', zh: '泵送尖端' },
  { ko: '리투오', en: 'Rituo', es: 'Rituo', ja: 'リトゥオ', zh: 'Rituo' },
  { ko: '라이트', en: 'Light', es: 'Light', ja: 'ライト', zh: 'Light' },
  { ko: '신논현', en: 'Sinnonhyeon', es: 'Sinnonhyeon', ja: '新論峴', zh: '新论岘' },
  { ko: '압구정', en: 'Apgujeong', es: 'Apgujeong', ja: '狎鷗亭', zh: '狎鸥亭' },
  { ko: '왕십리', en: 'Wangsimni', es: 'Wangsimni', ja: '往十里', zh: '往十里' },
  { ko: '차세대', en: 'Next-Gen', es: 'Próxima Gen', ja: '次世代', zh: '新一代' },
  { ko: '토닝', en: 'Toning', es: 'Toning', ja: 'トーニング', zh: '调Q' },
  { ko: '필러', en: 'Filler', es: 'Relleno', ja: 'フィラー', zh: '填充' },
  { ko: '힐러', en: 'Healer', es: 'Healer', ja: 'ヒーラー', zh: 'Healer' },
  { ko: '제오민', en: 'Xeomin', es: 'Xeomin', ja: 'ゼオミン', zh: 'Xeomin' },
  // Body part/area terms
  { ko: '이마', en: 'Forehead', es: 'Frente', ja: '額', zh: '额头' },
  { ko: '미간', en: 'Glabella', es: 'Entrecejo', ja: '眉間', zh: '眉间' },
  { ko: '얼굴', en: 'Face', es: 'Rostro', ja: '顔', zh: '脸部' },
  { ko: '전체', en: 'Full', es: 'Completo', ja: '全体', zh: '全部' },
  { ko: '부위', en: 'Area', es: 'Zona', ja: '部位', zh: '部位' },
  { ko: '바디', en: 'Body', es: 'Cuerpo', ja: 'ボディ', zh: '身体' },
  // Unit/count terms
  { ko: '만줄', en: '0k lines', es: '0k líneas', ja: '万ライン', zh: '万线' },
  { ko: '국산', en: 'Korean', es: 'Coreano', ja: '韓国産', zh: '韩产' },
  { ko: '수입', en: 'Imported', es: 'Importado', ja: '輸入', zh: '进口' },
  { ko: '첫방문', en: 'First Visit', es: 'Primera Visita', ja: '初回', zh: '首次' },
  // Category/event terms
  { ko: '이벤트', en: 'Event', es: 'Evento', ja: 'イベント', zh: '活动' },
  { ko: '행복', en: 'Happy', es: 'Felicidad', ja: 'ハッピー', zh: '幸福' },
  { ko: '핫딜', en: 'Hot Deal', es: 'Oferta', ja: 'お得', zh: '热门优惠' },
  // Branch location names
  { ko: '청담', en: 'Cheongdam', es: 'Cheongdam', ja: '清潭', zh: '清潭' },
  { ko: '강남', en: 'Gangnam', es: 'Gangnam', ja: '江南', zh: '江南' },
  { ko: '선릉', en: 'Seolleung', es: 'Seolleung', ja: '宣陵', zh: '宣陵' },
  { ko: '삼성', en: 'Samsung', es: 'Samsung', ja: '三成', zh: '三成' },
  { ko: '역삼', en: 'Yeoksam', es: 'Yeoksam', ja: '駅三', zh: '驿三' },
  { ko: '성수', en: 'Seongsu', es: 'Seongsu', ja: '聖水', zh: '圣水' },
  { ko: '건대', en: 'Konkuk', es: 'Konkuk', ja: '建大', zh: '建大' },
  { ko: '의원', en: 'Clinic', es: 'Clínica', ja: 'クリニック', zh: '诊所' },
  { ko: '제모', en: 'Hair Removal', es: 'Depilación', ja: '脱毛', zh: '脱毛' },
  // Single-char terms (shorter, must come last)
  { ko: '샷', en: 'shots', es: 'disparos', ja: 'ショット', zh: '发' },
  { ko: '줄', en: 'lines', es: 'líneas', ja: 'ライン', zh: '线' },
  { ko: '회', en: 'session', es: 'sesión', ja: '回', zh: '次' },
  { ko: '턱', en: 'Jaw', es: 'Mandíbula', ja: '顎', zh: '下巴' },
  { ko: '목', en: 'Neck', es: 'Cuello', ja: '首', zh: '颈部' },
  { ko: '점', en: 'Branch', es: 'Suc.', ja: '店', zh: '店' },
  // Date/month terms
  { ko: '12월', en: 'Dec', es: 'Dic', ja: '12月', zh: '12月' },
  { ko: '11월', en: 'Nov', es: 'Nov', ja: '11月', zh: '11月' },
  { ko: '10월', en: 'Oct', es: 'Oct', ja: '10月', zh: '10月' },
  { ko: '9월', en: 'Sep', es: 'Sep', ja: '9月', zh: '9月' },
  { ko: '8월', en: 'Aug', es: 'Ago', ja: '8月', zh: '8月' },
  { ko: '7월', en: 'Jul', es: 'Jul', ja: '7月', zh: '7月' },
  { ko: '6월', en: 'Jun', es: 'Jun', ja: '6月', zh: '6月' },
  { ko: '5월', en: 'May', es: 'May', ja: '5月', zh: '5月' },
  { ko: '4월', en: 'Apr', es: 'Abr', ja: '4月', zh: '4月' },
  { ko: '3월', en: 'Mar', es: 'Mar', ja: '3月', zh: '3月' },
  { ko: '2월', en: 'Feb', es: 'Feb', ja: '2月', zh: '2月' },
  { ko: '1월', en: 'Jan', es: 'Ene', ja: '1月', zh: '1月' },
].sort((a, b) => b.ko.length - a.ko.length);

export function translateText(text: string, lang: Lang): string {
  if (lang === 'ko') return text;
  let result = text;
  for (const entry of GLOSSARY) {
    result = result.replaceAll(entry.ko, entry[lang]);
  }
  return result;
}
