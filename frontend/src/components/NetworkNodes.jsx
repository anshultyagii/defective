import React, { useEffect, useRef } from "react";
import "./NetworkNodes.css";

/**
 * NetworkNodes — animated particle network background (SVG)
 * ----------------------------------------------------------------------------
 * Same simulation as the nsBaazar login page's canvas particle-network effect
 * (script 2.js) — particles drift and bounce off the viewport edges, and any
 * two particles closer than `linkDist` get a connecting line whose opacity
 * fades with distance — but rendered as real animated SVG <circle>/<line>
 * elements instead of a <canvas>, and recolored white.
 *
 * Perf note: instead of creating/destroying SVG elements every frame, a pool
 * of <line> elements is pre-allocated up front and each tick just re-points
 * their x1/y1/x2/y2/opacity (unused pool lines get opacity 0). <circle> node
 * positions are likewise mutated directly via refs each frame rather than
 * through React state, so nothing re-renders during the animation.
 *
 * Fixed, full-bleed, behind the foreground glass UI (L3). Purely decorative:
 * aria-hidden, no pointer events.
 * ----------------------------------------------------------------------------
 */

const CONFIG = {
  density: 26000, // elegantly balanced star count
  maxSpeedX: 0.15,
  maxSpeedY: 0.05, // slightly more organic vertical float
  linkDist: 200, // expanded radius so stars can form groups of 4 or 5
  dotRadius: [1, 2.4],
  maxLinesPerNode: 10, // increased pool size to accommodate the denser web
};

function computeParticleCount() {
  if (typeof window === "undefined") return 0;
  return Math.round((window.innerWidth * window.innerHeight) / CONFIG.density);
}

const initialParticleCount = computeParticleCount();
const initialLinePoolSize = initialParticleCount * CONFIG.maxLinesPerNode;

export default function NetworkNodes() {
  const svgRef = useRef(null);
  const nodeRefs = useRef([]);
  const lineRefs = useRef([]);
  const particlesRef = useRef([]);
  const poolSizeRef = useRef(initialParticleCount);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let w, h;
    let rafId = null;

    function buildParticles() {
      // never create more particles than we have <circle>/<line> pool
      // elements for — the pool size is fixed at mount to avoid re-rendering.
      const count = Math.min(
        Math.round((w * h) / CONFIG.density),
        poolSizeRef.current,
      );
      particlesRef.current = new Array(count).fill(0).map(() => ({
        // Extend seamlessly and uniformly across the entire horizontal width
        x: Math.random() * w,
        // Softly concentrate in the vertical middle (creates a natural, organic milky-way band)
        y: h / 2 + (Math.random() > 0.5 ? 1 : -1) * Math.pow(Math.random(), 1.6) * (h / 2),
        vx: (Math.random() > 0.5 ? 1 : -1) * (0.05 + Math.random() * CONFIG.maxSpeedX),
        vy: (Math.random() - 0.5) * CONFIG.maxSpeedY,
        r:
          CONFIG.dotRadius[0] +
          Math.random() * (CONFIG.dotRadius[1] - CONFIG.dotRadius[0]),
        glowPhase: Math.random() * Math.PI * 2,
      }));

      // hide any pool circles beyond the active particle count
      for (let i = count; i < nodeRefs.current.length; i++) {
        const c = nodeRefs.current[i];
        if (c) c.setAttribute("opacity", 0);
      }
      for (let i = 0; i < count; i++) {
        const c = nodeRefs.current[i];
        if (c) c.removeAttribute("opacity");
      }
    }

    function resize() {
      w = window.innerWidth;
      h = window.innerHeight;
      svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
      buildParticles();
    }

    function step(timestamp) {
      if (!timestamp) timestamp = performance.now();
      const basePhase = (timestamp / 4000) * Math.PI * 2;

      const particles = particlesRef.current;
      const nodes = nodeRefs.current;
      const lines = lineRefs.current;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;

        // Normalize sine to 0-1
        const sineNorm = (Math.sin(basePhase + p.glowPhase) + 1) / 2;
        // Adjust opacity range so it stays visible enough to show the gray color when dim
        const opacity = 0.2 + sineNorm * 0.8;
        // Interpolate color from gray (100) to white (255)
        const colorVal = Math.floor(100 + sineNorm * 155);

        const circle = nodes[i];
        if (circle) {
          circle.setAttribute("cx", p.x);
          circle.setAttribute("cy", p.y);
          circle.setAttribute("opacity", opacity.toFixed(3));
          circle.setAttribute("fill", `rgb(${colorVal}, ${colorVal}, ${colorVal})`);
          // Apply individual radius and make it swell slightly at peak glow
          circle.setAttribute("r", (p.r + sineNorm * 1.5).toFixed(2));
        }
      }

      let lineIndex = 0;
      const maxLines = lines.length;
      for (let i = 0; i < particles.length && lineIndex < maxLines; i++) {
        for (let j = i + 1; j < particles.length && lineIndex < maxLines; j++) {
          const a = particles[i];
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONFIG.linkDist) {
            const line = lines[lineIndex];
            if (line) {
              const alpha = (1 - dist / CONFIG.linkDist) * 0.35;
              line.setAttribute("x1", a.x);
              line.setAttribute("y1", a.y);
              line.setAttribute("x2", b.x);
              line.setAttribute("y2", b.y);
              line.setAttribute("opacity", alpha.toFixed(3));
            }
            lineIndex++;
          }
        }
      }
      // hide any pool lines not used this frame
      for (let k = lineIndex; k < maxLines; k++) {
        const line = lines[k];
        if (line) line.setAttribute("opacity", 0);
      }

      if (!reduceMotion) rafId = requestAnimationFrame(step);
    }

    resize();
    step();

    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <svg
      ref={svgRef}
      className="l2-network-nodes"
      aria-hidden="true"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <filter id="node-glow" x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g className="net-lines">
        {Array.from({ length: initialLinePoolSize }).map((_, i) => (
          <line
            key={i}
            ref={(el) => (lineRefs.current[i] = el)}
            className="net-line"
            x1="0"
            y1="0"
            x2="0"
            y2="0"
            opacity="0"
          />
        ))}
      </g>
      <g className="net-nodes">
        {Array.from({ length: initialParticleCount }).map((_, i) => (
          <circle
            key={i}
            ref={(el) => (nodeRefs.current[i] = el)}
            className="net-node"
            cx="0"
            cy="0"
            r={CONFIG.dotRadius[1]}
          />
        ))}
      </g>
    </svg>
  );
}
