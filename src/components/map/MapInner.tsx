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

const clinicIcon = L.divIcon({
  className: '',
  html: '<div style="width:12px;height:12px;border-radius:50%;background:#6366f1;border:2px solid #fff;box-shadow:0 2px 6px rgba(99,102,241,0.5)"></div>',
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

function formatEstb(s?: string) {
  if (!s || s.length !== 8) return '';
  return `${s.slice(0, 4)}.${s.slice(4, 6)}.${s.slice(6)}`;
}

interface MapInnerProps {
  clinics: HiraClinic[];
  selectedGu: string | null;
  onClinicClick?: (clinic: HiraClinic) => void;
}

export default function MapInner({ clinics, selectedGu, onClinicClick }: MapInnerProps) {
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
      const m = L.marker([c.lat, c.lng], { icon: clinicIcon });
      // 네이버: 좌표 기반 장소 검색 (병원명 + 주소 + 좌표 중심)
      const nmap = `https://map.naver.com/p/search/${encodeURIComponent(c.name)}?c=${c.lng},${c.lat},17,0,0,0,dh`;
      // 카카오: 좌표 기반 키워드 검색 (lat/lng → kakao의 WGS84 좌표)
      const kmap = `https://map.kakao.com/link/search/${encodeURIComponent(c.name)}?longitude=${c.lng}&latitude=${c.lat}`;

      const linkStyle = 'display:inline-flex;align-items:center;justify-content:center;padding:6px 10px;background:#eef2ff;color:#6366f1;border-radius:8px;font-size:12px;font-weight:600;text-decoration:none;flex:1;text-align:center;min-width:0;white-space:nowrap;';
      const linkHover = 'transition:background 0.15s;';

      m.bindPopup(`
        <div style="font-family:inherit;font-size:13px">
          <div style="font-weight:700;font-size:15px;margin-bottom:6px;line-height:1.35">${c.name}</div>
          <div style="font-size:12px;color:#64748b;margin-bottom:3px;line-height:1.4">${c.addr}</div>
          ${c.tel ? `<div style="font-size:12px;color:#64748b;margin-bottom:3px">📞 <a href="tel:${c.tel.replace(/[^0-9]/g, '')}" style="color:#6366f1;text-decoration:none">${c.tel}</a></div>` : ''}
          <div style="display:flex;gap:6px;margin-top:10px;padding-top:10px;border-top:1px solid #e2e8f0">
            ${c.homepage ? `<a href="${c.homepage}" target="_blank" rel="noopener" style="${linkStyle}${linkHover}">🌐 홈페이지</a>` : ''}
            <a href="${nmap}" target="_blank" rel="noopener" style="${linkStyle}${linkHover}">🗺️ 네이버</a>
            <a href="${kmap}" target="_blank" rel="noopener" style="${linkStyle}${linkHover}">🗺️ 카카오</a>
          </div>
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
