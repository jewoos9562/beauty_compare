/* global L */

const SEOUL_CENTER = [37.5665, 126.9780];
const DEFAULT_ZOOM = 12;

let allClinics = [];
let filteredClinics = [];
let markerMap = new Map(); // id -> marker
let activeMarker = null;
let activeListItem = null;

// ---------- Map init ----------
const map = L.map("map", {
  center: SEOUL_CENTER,
  zoom: DEFAULT_ZOOM,
  zoomControl: false,
  preferCanvas: true,
});

L.control.zoom({ position: "bottomright" }).addTo(map);

// CartoDB Positron — clean light theme (OSM-based, Korea compatible)
L.tileLayer(
  "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
  {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: "abcd",
    maxZoom: 19,
  }
).addTo(map);

// ---------- Custom marker icon ----------
const clinicIcon = L.divIcon({
  className: "clinic-marker",
  html: '<div class="clinic-marker-dot"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

// ---------- Cluster group ----------
const clusterGroup = L.markerClusterGroup({
  chunkedLoading: true,
  chunkInterval: 100,
  spiderfyOnMaxZoom: true,
  showCoverageOnHover: false,
  maxClusterRadius: 50,
  disableClusteringAtZoom: 17,
});
map.addLayer(clusterGroup);

// ---------- Data load ----------
async function loadData() {
  const res = await fetch("data/seoul_derma.json");
  const data = await res.json();
  allClinics = data;
  filteredClinics = data;

  document.getElementById("total-count").textContent =
    data.length.toLocaleString("ko-KR");

  populateGuFilter(data);
  renderMarkers(data);
  renderList(data);
  updateVisibleCount(data.length);
}

// ---------- Gu filter ----------
function populateGuFilter(data) {
  const guSet = new Map();
  for (const c of data) {
    guSet.set(c.gu, (guSet.get(c.gu) || 0) + 1);
  }
  const sorted = [...guSet.entries()].sort((a, b) => b[1] - a[1]);
  const select = document.getElementById("gu-filter");
  for (const [gu, count] of sorted) {
    const opt = document.createElement("option");
    opt.value = gu;
    opt.textContent = `${gu} (${count.toLocaleString("ko-KR")})`;
    select.appendChild(opt);
  }
}

// ---------- Markers ----------
function renderMarkers(data) {
  clusterGroup.clearLayers();
  markerMap.clear();

  const markers = [];
  for (const c of data) {
    const m = L.marker([c.lat, c.lng], { icon: clinicIcon });
    m.bindPopup(buildPopup(c), {
      maxWidth: 320,
      closeButton: true,
      autoPan: true,
    });
    m.on("click", () => highlightListItem(c.id));
    markerMap.set(c.id, m);
    markers.push(m);
  }
  clusterGroup.addLayers(markers);
}

function buildPopup(c) {
  const telLink = c.tel
    ? `<a href="tel:${c.tel.replace(/[^0-9]/g, "")}">${c.tel}</a>`
    : "—";
  const estbDate = formatEstb(c.estbDd);

  // 홈페이지가 JSON에 있으면 바로 링크, 없으면 구글 검색 폴백
  const homepage = c.homepage
    ? `<a href="${escapeHtml(c.homepage)}" target="_blank" rel="noopener">🌐 공식 홈페이지</a>`
    : `<a href="https://www.google.com/search?q=${encodeURIComponent(
        c.name + " " + c.gu + " 공식 홈페이지"
      )}" target="_blank" rel="noopener">🔎 홈페이지 검색</a>`;

  // 지도 링크 — 병원명 + 좌표 기반 정확 검색
  // Naver: 검색 쿼리 + 중심좌표 (lng,lat,줌)
  const nmap = `https://map.naver.com/p/search/${encodeURIComponent(
    c.name + " " + c.addr
  )}?c=${c.lng},${c.lat},17,0,0,0,dh`;
  // Kakao: 검색어 + 중심좌표
  const kmap = `https://map.kakao.com/?q=${encodeURIComponent(
    c.name
  )}&map_type=TYPE_MAP&center=${c.lng},${c.lat}`;

  return `
    <div class="popup-name">${escapeHtml(c.name)}</div>
    <div class="popup-row">
      <span class="popup-label">주소</span>
      <span class="popup-value">${escapeHtml(c.addr)}</span>
    </div>
    <div class="popup-row">
      <span class="popup-label">전화</span>
      <span class="popup-value">${telLink}</span>
    </div>
    <div class="popup-row">
      <span class="popup-label">개설</span>
      <span class="popup-value">${estbDate}</span>
    </div>
    <div class="popup-links">
      ${homepage}
    </div>
    <div class="popup-links">
      <a href="${nmap}" target="_blank" rel="noopener">🗺️ 네이버 지도</a>
      <a href="${kmap}" target="_blank" rel="noopener">🗺️ 카카오맵</a>
    </div>
  `;
}

function formatEstb(s) {
  if (!s || s.length !== 8) return "—";
  return `${s.slice(0, 4)}.${s.slice(4, 6)}.${s.slice(6, 8)}`;
}

function escapeHtml(s) {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ---------- List ----------
function renderList(data) {
  const list = document.getElementById("list");
  list.innerHTML = "";

  if (data.length === 0) {
    list.innerHTML = '<div class="list-empty">결과가 없습니다.</div>';
    return;
  }

  // 큰 리스트 성능: 최대 500건만 렌더링
  const MAX_RENDER = 500;
  const shown = data.slice(0, MAX_RENDER);

  const frag = document.createDocumentFragment();
  for (const c of shown) {
    const item = document.createElement("div");
    item.className = "list-item";
    item.dataset.id = c.id;
    item.innerHTML = `
      <div class="list-item-name">${escapeHtml(c.name)}</div>
      <div class="list-item-meta">
        <span class="gu-tag">${escapeHtml(c.gu)}</span>
        <span>${escapeHtml(c.addr)}</span>
      </div>
    `;
    item.addEventListener("click", () => flyToClinic(c));
    frag.appendChild(item);
  }
  list.appendChild(frag);

  if (data.length > MAX_RENDER) {
    const more = document.createElement("div");
    more.className = "list-empty";
    more.textContent = `… 외 ${(data.length - MAX_RENDER).toLocaleString(
      "ko-KR"
    )}곳 (지도에서 확인)`;
    list.appendChild(more);
  }
}

function flyToClinic(c) {
  const m = markerMap.get(c.id);
  if (!m) return;
  // 클러스터에 포함된 경우 zoomToShowLayer 사용
  clusterGroup.zoomToShowLayer(m, () => {
    m.openPopup();
    map.panTo([c.lat, c.lng], { animate: true, duration: 0.4 });
  });
  highlightListItem(c.id);
}

function highlightListItem(id) {
  if (activeListItem) activeListItem.classList.remove("active");
  const el = document.querySelector(`.list-item[data-id="${CSS.escape(id)}"]`);
  if (el) {
    el.classList.add("active");
    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    activeListItem = el;
  }
}

// ---------- Filter & search ----------
function applyFilters() {
  const gu = document.getElementById("gu-filter").value;
  const q = document.getElementById("search").value.trim().toLowerCase();

  filteredClinics = allClinics.filter((c) => {
    if (gu && c.gu !== gu) return false;
    if (q) {
      const hay = `${c.name} ${c.addr}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  renderMarkers(filteredClinics);
  renderList(filteredClinics);
  updateVisibleCount(filteredClinics.length);
}

function updateVisibleCount(n) {
  document.getElementById("visible-count").textContent =
    n.toLocaleString("ko-KR");
}

let searchDebounce;
document.getElementById("search").addEventListener("input", () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(applyFilters, 200);
});

document.getElementById("gu-filter").addEventListener("change", () => {
  applyFilters();
  const gu = document.getElementById("gu-filter").value;
  if (gu) {
    const items = allClinics.filter((c) => c.gu === gu);
    if (items.length) {
      const bounds = L.latLngBounds(items.map((c) => [c.lat, c.lng]));
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }
});

// ---------- Sidebar toggle ----------
document.getElementById("toggle-sidebar").addEventListener("click", () => {
  document.getElementById("sidebar").classList.toggle("collapsed");
  setTimeout(() => map.invalidateSize(), 320);
});

// ---------- Kick off ----------
loadData().catch((e) => {
  console.error(e);
  alert("데이터 로드 실패: " + e.message);
});
