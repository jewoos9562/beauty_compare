'use client';

import { useEffect, useRef, useMemo, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';
import type { HiraClinic } from '@/types/hira';

const SEOUL_CENTER: [number, number] = [37.5665, 126.978];
const DEFAULT_ZOOM = 12;

const defaultIcon = L.divIcon({
  className: '',
  html: '<div style="width:10px;height:10px;border-radius:50%;background:#94a3b8;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.15)"></div>',
  iconSize: [10, 10],
  iconAnchor: [5, 5],
});

const featuredIcon = L.divIcon({
  className: '',
  html: `<div style="width:18px;height:18px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#ec4899);border:2.5px solid #fff;box-shadow:0 2px 8px rgba(99,102,241,0.5);display:flex;align-items:center;justify-content:center">
    <div style="width:6px;height:6px;background:#fff;border-radius:50%"></div>
  </div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const FEATURED_CHAINS = ['톡스앤필', '밴스', '유앤아이', '데이뷰', '에버스', '쁨', '블리비'];

function isFeatured(name: string): boolean {
  return FEATURED_CHAINS.some((chain) => name.includes(chain));
}

interface MapInnerProps {
  clinics: HiraClinic[];
  selectedGu: string | null;
  featuredMap?: Record<string, string>; // HIRA name → clinic page ID
  onClinicClick?: (clinic: HiraClinic) => void;
}

export default function MapInner({ clinics, selectedGu, featuredMap = {}, onClinicClick }: MapInnerProps) {
  const mapRef = useRef<L.Map | null>(null);
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: SEOUL_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: false,
      preferCanvas: true,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    const cluster = L.markerClusterGroup({
      chunkedLoading: true,
      chunkInterval: 100,
      maxClusterRadius: 50,
      disableClusteringAtZoom: 17,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
    });

    map.addLayer(cluster);
    mapRef.current = map;
    clusterRef.current = cluster;

    return () => {
      map.remove();
      mapRef.current = null;
      clusterRef.current = null;
    };
  }, []);

  useEffect(() => {
    const cluster = clusterRef.current;
    if (!cluster) return;

    cluster.clearLayers();
    const markers: L.Marker[] = [];

    for (const c of clinics) {
      const featured = isFeatured(c.name);
      const clinicPageId = featuredMap[c.name] || null;
      const m = L.marker([c.lat, c.lng], { icon: featured ? featuredIcon : defaultIcon, zIndexOffset: featured ? 1000 : 0 });

      const nmap = `https://map.naver.com/p/search/${encodeURIComponent(c.name)}?c=${c.lng},${c.lat},17,0,0,0,dh`;
      const kmap = `https://map.kakao.com/link/search/${encodeURIComponent(c.name)}?longitude=${c.lng}&latitude=${c.lat}`;

      const linkStyle = 'display:inline-flex;align-items:center;justify-content:center;padding:6px 10px;background:#eef2ff;color:#6366f1;border-radius:8px;font-size:12px;font-weight:600;text-decoration:none;flex:1;text-align:center;min-width:0;white-space:nowrap;';
      const priceBtn = 'display:block;width:100%;padding:8px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border-radius:10px;font-size:13px;font-weight:700;text-decoration:none;text-align:center;margin-top:10px;';

      const featuredBadge = featured
        ? '<div style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;background:linear-gradient(135deg,#6366f1,#ec4899);color:#fff;border-radius:6px;font-size:10px;font-weight:700;margin-bottom:8px">⭐ 가격 비교 가능</div>'
        : '';

      m.bindPopup(`
        <div style="font-family:inherit;font-size:13px">
          ${featuredBadge}
          <div style="font-weight:700;font-size:15px;margin-bottom:6px;line-height:1.35">${c.name}</div>
          <div style="font-size:12px;color:#64748b;margin-bottom:3px;line-height:1.4">${c.addr}</div>
          ${c.tel ? `<div style="font-size:12px;color:#64748b;margin-bottom:3px">📞 <a href="tel:${c.tel.replace(/[^0-9]/g, '')}" style="color:#6366f1;text-decoration:none">${c.tel}</a></div>` : ''}
          <div style="display:flex;gap:6px;margin-top:10px;padding-top:10px;border-top:1px solid #e2e8f0">
            ${c.homepage ? `<a href="${c.homepage}" target="_blank" rel="noopener" style="${linkStyle}">🌐 홈페이지</a>` : ''}
            <a href="${nmap}" target="_blank" rel="noopener" style="${linkStyle}">🗺️ 네이버</a>
            <a href="${kmap}" target="_blank" rel="noopener" style="${linkStyle}">🗺️ 카카오</a>
          </div>
          ${featured && clinicPageId ? `<a href="/clinic/${clinicPageId}" style="${priceBtn}">💰 시술 가격표 보기</a>` : ''}
        </div>
      `, { maxWidth: 300, closeButton: true });

      if (onClinicClick) {
        m.on('click', () => onClinicClick(c));
      }
      markers.push(m);
    }

    cluster.addLayers(markers);
  }, [clinics, onClinicClick]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (selectedGu) {
      const guClinics = clinics.filter((c) => c.gu === selectedGu);
      if (guClinics.length) {
        const bounds = L.latLngBounds(guClinics.map((c) => [c.lat, c.lng] as [number, number]));
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      }
    } else {
      map.setView(SEOUL_CENTER, DEFAULT_ZOOM);
    }
  }, [selectedGu, clinics]);

  return <div ref={containerRef} className="w-full h-full" />;
}
