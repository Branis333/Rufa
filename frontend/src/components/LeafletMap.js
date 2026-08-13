import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import colors from '../theme/colors';
import { radius } from '../theme/spacing';

const MARKER_COLORS = {
  user: colors.primary,
  donor: colors.navy,
  hospital: colors.critical,
  recipient: '#D97706',
};

function buildShellHtml(center, zoom) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; width: 100%; margin: 0; padding: 0; }
    .rufa-dot { border-radius: 50%; border: 2px solid #fff; box-shadow: 0 1px 4px rgba(0,0,0,0.4); transition: transform 0.4s linear; }
    .rufa-marker-wrap { position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
    .rufa-pulse-ring {
      position: absolute;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: 2px solid;
      opacity: 0.6;
      animation: rufa-pulse 1.8s ease-out infinite;
    }
    @keyframes rufa-pulse {
      0% { transform: scale(0.3); opacity: 0.6; }
      100% { transform: scale(1.8); opacity: 0; }
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var map = L.map('map', { zoomControl: true, attributionControl: false })
      .setView([${center.lat}, ${center.lng}], ${zoom});

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    var markerLayer = L.layerGroup().addTo(map);
    var circleLayer = L.layerGroup().addTo(map);
    var routeLayer = L.layerGroup().addTo(map);

    function renderMarkers(items) {
      markerLayer.clearLayers();
      items.forEach(function (m) {
        var iconSize = m.pulse ? 46 : m.size;
        var dotHtml = '<div class="rufa-dot" style="width:' + m.size + 'px;height:' + m.size + 'px;background:' + m.color + ';"></div>';
        var html = m.pulse
          ? '<div class="rufa-marker-wrap"><div class="rufa-pulse-ring" style="border-color:' + m.color + ';"></div>' + dotHtml + '</div>'
          : dotHtml;
        var icon = L.divIcon({
          className: '',
          html: html,
          iconSize: [iconSize, iconSize],
          iconAnchor: [iconSize / 2, iconSize / 2],
        });
        var marker = L.marker([m.lat, m.lng], { icon: icon });
        if (m.label) {
          marker.bindPopup(m.label);
        }
        markerLayer.addLayer(marker);
      });
    }

    function renderCircles(items) {
      circleLayer.clearLayers();
      items.forEach(function (c) {
        var circle = L.circle([c.lat, c.lng], {
          radius: 600,
          color: c.color,
          weight: 1,
          fillColor: c.color,
          fillOpacity: 0.18,
        });
        if (c.label) {
          circle.bindPopup(c.label);
        }
        circleLayer.addLayer(circle);
      });
    }

    function renderRoutes(items) {
      routeLayer.clearLayers();
      items.forEach(function (r) {
        var line = L.polyline([r.from, r.to], {
          color: r.color,
          weight: 4,
          opacity: 0.85,
          dashArray: '2, 10',
          lineCap: 'round',
        });
        routeLayer.addLayer(line);
      });
    }

    window.rufaUpdate = function (payloadJson) {
      var data = JSON.parse(payloadJson);
      if (data.markers) renderMarkers(data.markers);
      if (data.circles) renderCircles(data.circles);
      if (data.routes) renderRoutes(data.routes);
      if (data.view) map.setView([data.view.lat, data.view.lng], data.view.zoom);
    };
  </script>
</body>
</html>`;
}

function toPayload(markers, routes, center, zoom) {
  const dotMarkers = markers.filter((m) => !m.approx);
  const approxMarkers = markers.filter((m) => m.approx);

  return {
    markers: dotMarkers.map((m) => ({
      lat: m.lat,
      lng: m.lng,
      color: MARKER_COLORS[m.kind] || colors.navy,
      label: m.label || '',
      size: m.kind === 'user' ? 18 : 14,
      pulse: m.kind === 'user',
    })),
    circles: approxMarkers.map((m) => ({
      lat: m.lat,
      lng: m.lng,
      color: MARKER_COLORS[m.kind] || colors.navy,
      label: m.label || '',
    })),
    routes: routes.map((r) => ({
      from: [r.from.lat, r.from.lng],
      to: [r.to.lat, r.to.lng],
      color: r.color || colors.primary,
    })),
    view: { lat: center.lat, lng: center.lng, zoom },
  };
}

export default function LeafletMap({ markers = [], routes = [], center, zoom = 13, style }) {
  const webviewRef = useRef(null);
  const htmlRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);

  if (htmlRef.current === null) {
    htmlRef.current = buildShellHtml(center, zoom);
  }
  const source = useMemo(() => ({ html: htmlRef.current }), []);

  useEffect(() => {
    if (Platform.OS === 'web' || !isLoaded) return;
    const payloadJson = JSON.stringify(toPayload(markers, routes, center, zoom));
    const js = `window.rufaUpdate && window.rufaUpdate(${JSON.stringify(payloadJson)}); true;`;
    webviewRef.current?.injectJavaScript(js);
  }, [markers, routes, center, zoom, isLoaded]);

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.placeholder, style]}>
        <Ionicons name="map" size={32} color={colors.primary} />
        <Text style={styles.placeholderText}>
          {markers.length} location{markers.length === 1 ? '' : 's'} on the map
        </Text>
      </View>
    );
  }

  return (
    <WebView
      ref={webviewRef}
      originWhitelist={['*']}
      source={source}
      style={style}
      scrollEnabled={false}
      javaScriptEnabled
      onLoad={() => setIsLoaded(true)}
    />
  );
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: '#EBF2F7',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radius.md,
  },
  placeholderText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.navy,
  },
});
