'use client';

import { useRef } from 'react';
import SakshiDotMatrix from './SakshiDotMatrix';
import SakshiCrystalScene from './SakshiCrystalScene';
import VantaFog from './VantaFog';

export default function PortfolioHero() {
  const heroPanelRef = useRef<HTMLElement | null>(null);
  const bindHeroPanel = (node: HTMLElement | null) => {
    heroPanelRef.current = node;
  };

  return (
    <>
      <header className="navbar">
        <a className="logo" href="https://sumitgupta.me/" aria-label="Sumit Gupta homepage">
          Sumit Gupta<span className="logo-accent" />
        </a>

        <nav className="social-links" aria-label="Social profiles">
          <a
            href="https://github.com/Sumi-tgupta"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub profile"
            title="GitHub"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 .9a11.1 11.1 0 0 0-3.51 21.63c.56.1.76-.24.76-.54v-2.08c-3.1.67-3.76-1.32-3.76-1.32-.51-1.3-1.24-1.65-1.24-1.65-1.01-.69.08-.68.08-.68 1.12.08 1.71 1.15 1.71 1.15 1 1.7 2.63 1.21 3.27.92.1-.71.39-1.21.71-1.49-2.48-.28-5.09-1.24-5.09-5.52 0-1.22.44-2.21 1.15-2.99-.12-.28-.5-1.42.11-2.95 0 0 .94-.3 3.05 1.14a10.6 10.6 0 0 1 5.55 0c2.11-1.44 3.05-1.14 3.05-1.14.61 1.53.23 2.67.11 2.95.72.78 1.15 1.77 1.15 2.99 0 4.29-2.61 5.24-5.1 5.51.4.35.76 1.02.76 2.06v3.06c0 .3.2.65.77.54A11.1 11.1 0 0 0 12 .9Z" />
            </svg>
          </a>
          <a
            href="https://linkedin.com/in/sumi-tgupta"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn profile"
            title="LinkedIn"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.44-2.13 2.94v5.67H9.36V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.26 2.37 4.26 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.12 20.45H3.56V9h3.56v11.45ZM22.23 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0h.01Z" />
            </svg>
          </a>
        </nav>
      </header>

      <main id="home-page">
        <section className="vanta-panel" aria-label="Building sAkshI" ref={bindHeroPanel}>
          <VantaFog />
          <SakshiCrystalScene heroPanelRef={heroPanelRef} />
          <div className="hero-content">
            <h1 className="hero-title">
              Building<br />
              <SakshiDotMatrix />
            </h1>
          </div>
        </section>
      </main>
    </>
  );
}
