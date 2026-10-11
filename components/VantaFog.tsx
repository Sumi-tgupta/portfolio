'use client';

import * as THREE from 'three';

import { useEffect, useRef } from 'react';

type VantaEffect = { destroy: () => void };

declare global {
  interface Window {
    THREE?: unknown;
    VANTA?: {
      FOG?: (options: Record<string, unknown>) => VantaEffect;
    };
  }
}


const VANTA_SCRIPT = 'https://cdn.jsdelivr.net/npm/vanta@latest/dist/vanta.fog.min.js';

function loadScript(src: string, key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[data-portfolio-script="${key}"]`);

    if (existing?.dataset.loaded === 'true') {
      resolve();
      return;
    }

    const script = existing ?? document.createElement('script');
    const onLoad = () => {
      script.dataset.loaded = 'true';
      resolve();
    };
    const onError = () => reject(new Error(`Unable to load ${src}`));

    script.addEventListener('load', onLoad, { once: true });
    script.addEventListener('error', onError, { once: true });

    if (!existing) {
      script.src = src;
      script.async = true;
      script.dataset.portfolioScript = key;
      document.head.appendChild(script);
    }
  });
}

export default function VantaFog() {
  const backgroundRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    let effect: VantaEffect | null = null;

    async function initialize() {
      try {
        window.THREE = THREE;

        await loadScript(VANTA_SCRIPT, 'vanta-fog');

        if (cancelled || !backgroundRef.current || !window.VANTA?.FOG) return;

        effect = window.VANTA.FOG({
          el: '#vanta-background',
          mouseControls: true,
          touchControls: true,
          gyroControls: false,
          minHeight: 200.0,
          minWidth: 200.0,
          highlightColor: 0x8b7cff,
          midtoneColor: 0x3358a8,
          lowlightColor: 0x151b35,
          baseColor: 0x050816,
          blurFactor: 0.6,
          speed: 0.8,
          zoom: 0.9,
        });
      } catch {
        // The CSS background remains visible if the optional fog scripts fail to load.
      }
    }

    void initialize();

    return () => {
      cancelled = true;
      effect?.destroy();
    };
  }, []);

  return <div id="vanta-background" ref={backgroundRef} aria-hidden="true" />;
}
