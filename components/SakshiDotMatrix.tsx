'use client';

import { useEffect } from 'react';

export default function SakshiDotMatrix() {
  useEffect(() => {
    const dispose = (() => {

        const sakshiText = document.getElementById("sakshi-text") as HTMLSpanElement | null;
        const sakshiLine = document.querySelector(".sakshi-line") as HTMLSpanElement | null;
        const dotCanvas = document.getElementById("sakshi-dots") as HTMLCanvasElement | null;
        const typingCursor = document.querySelector(".typing-cursor") as HTMLSpanElement | null;
        const fullText = "sAkshI";
        const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

        /* Tweak variables */
        const BASE_DOT_STEP_DESKTOP = 4;
        const BASE_DOT_STEP_MOBILE = 5;
        const DESKTOP_DOT_CAP = 2500;
        const MOBILE_DOT_CAP = 1200;
        const DOT_RADIUS_FACTOR = 0.42;
        const CANVAS_PADDING = 70;
        const REPEL_RADIUS_SCALE = 0.9;
        const REPEL_RADIUS_MIN = 70;
        const REPEL_RADIUS_MAX = 130;
        const REPEL_STRENGTH = 0.6;
        const SPRING_K = 0.08;
        const DAMPING = 0.82;
        const SPAWN_DELAY_MS = 450;
        const LETTER_INTERVAL_MS = 170;
        const SPAWN_DURATION_MS = 500;
        const SHIMMER_SPEED = 0.22;
        const COLOR_BUCKET_COUNT = 12;
        const COLOR_STOPS = [
          [22, 185, 131],
          [113, 235, 186],
          [228, 255, 243],
          [113, 235, 186],
          [22, 185, 131]
        ];

        let dotContext = null;
        let maskCanvas = null;
        let maskContext = null;
        let active = false;
        let disposed = false;
        let reducedMotion = motionQuery.matches;
        let heroIsVisible = !("IntersectionObserver" in window);
        let tabIsVisible = document.visibilityState === "visible";
        let animationFrameId = 0;
        let resizeTimer = 0;
        let resizeObserver = null;
        let intersectionObserver = null;
        let animationElapsedMs = 0;
        let lastFrameTime = 0;
        let lastPointerTime = 0;
        let canvasCssWidth = 0;
        let canvasCssHeight = 0;
        let canvasDpr = 1;
        let textWidth = 0;
        let fontSizePx = 100;
        let baseDotRadius = 1.7;
        let repelRadius = 90;
        let revealCount = 0;
        let pointerActive = false;
        let touchActive = false;
        let pointerX = -10000;
        let pointerY = -10000;
        let letterBounds = [];
        let letterRightOffsets = new Float32Array(0);
        let letterSpawnTimes = new Float32Array(fullText.length);
        let letterHasSpawned = new Uint8Array(fullText.length);
        let homeX = new Float32Array(0);
        let homeY = new Float32Array(0);
        let dotX = new Float32Array(0);
        let dotY = new Float32Array(0);
        let dotVX = new Float32Array(0);
        let dotVY = new Float32Array(0);
        let dotLetterIndex = new Float32Array(0);
        let dotBaseBucket = new Uint8Array(0);
        let dotNearCursor = new Float32Array(0);
        let bucketGroups = [];
        let dotCount = 0;
        let currentDotStep = BASE_DOT_STEP_DESKTOP;
        let fallbackTimers = [];
        let palette = [];
        let onMotionChange;

        function clamp(value, min, max) {
          return Math.min(max, Math.max(min, value));
        }

        function smoothstep01(value) {
          const t = clamp(value, 0, 1);
          return t * t * (3 - 2 * t);
        }

        function rgbToCss(rgb) {
          return `rgb(${Math.round(rgb[0])}, ${Math.round(rgb[1])}, ${Math.round(rgb[2])})`;
        }

        function makePalette() {
          const colors = [];
          for (let i = 0; i < COLOR_BUCKET_COUNT; i++) {
            const position = i / (COLOR_BUCKET_COUNT - 1);
            const segmentPosition = position * (COLOR_STOPS.length - 1);
            const segment = Math.min(COLOR_STOPS.length - 2, Math.floor(segmentPosition));
            const fraction = segmentPosition - segment;
            const a = COLOR_STOPS[segment];
            const b = COLOR_STOPS[segment + 1];
            colors.push(rgbToCss([
              a[0] + (b[0] - a[0]) * fraction,
              a[1] + (b[1] - a[1]) * fraction,
              a[2] + (b[2] - a[2]) * fraction
            ]));
          }
          return colors;
        }

        function getRevealCount(elapsedMs) {
          if (reducedMotion) return fullText.length;
          if (elapsedMs < SPAWN_DELAY_MS) return 0;
          return Math.min(
            fullText.length,
            Math.floor((elapsedMs - SPAWN_DELAY_MS) / LETTER_INTERVAL_MS) + 1
          );
        }

        function clearFallbackTimers() {
          fallbackTimers.forEach((timer) => window.clearTimeout(timer));
          fallbackTimers = [];
        }

        function startFallbackTypewriter() {
          active = false;
          sakshiLine.classList.remove("dots-active", "dots-pending");
          dotCanvas.style.display = "none";
          clearFallbackTimers();
          sakshiText.textContent = "";
          typingCursor.style.left = "";
          typingCursor.style.position = "";

          if (motionQuery.matches) {
            sakshiText.textContent = fullText;
            return;
          }

          let index = 0;
          const typeNextCharacter = () => {
            if (disposed || active || motionQuery.matches) return;
            if (index < fullText.length) {
              sakshiText.textContent += fullText.charAt(index);
              index += 1;
              fallbackTimers.push(window.setTimeout(typeNextCharacter, LETTER_INTERVAL_MS));
            }
          };
          fallbackTimers.push(window.setTimeout(typeNextCharacter, SPAWN_DELAY_MS));
        }

        function getCharacterBounds(spanRect, textNode) {
          const result = [];
          const range = document.createRange();
          for (let i = 0; i < fullText.length; i++) {
            range.setStart(textNode, i);
            range.setEnd(textNode, i + 1);
            const rect = range.getBoundingClientRect();
            result.push({
              left: rect.left - spanRect.left,
              right: rect.right - spanRect.left,
              center: (rect.left + rect.right) / 2 - spanRect.left
            });
          }
          range.detach?.();
          return result;
        }

        function drawMask(spanRect, style, textNode) {
          const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
          const width = Math.max(1, Math.ceil(spanRect.width));
          const height = Math.max(1, Math.ceil(spanRect.height));

          maskCanvas.width = Math.max(1, Math.ceil(width * dpr));
          maskCanvas.height = Math.max(1, Math.ceil(height * dpr));
          maskContext.setTransform(dpr, 0, 0, dpr, 0, 0);
          maskContext.clearRect(0, 0, width, height);
          maskContext.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
          maskContext.textBaseline = "alphabetic";
          maskContext.fillStyle = "#ffffff";

          const metrics = maskContext.measureText(fullText);
          const ascent = metrics.actualBoundingBoxAscent || fontSizePx * 0.78;
          const descent = metrics.actualBoundingBoxDescent || fontSizePx * 0.22;
          const baseline = Math.max(
            ascent,
            (height - ascent - descent) / 2 + ascent
          );

          const supportsLetterSpacing = "letterSpacing" in maskContext;
          if (supportsLetterSpacing) {
            try {
              maskContext.letterSpacing = style.letterSpacing;
              maskContext.fillText(fullText, 0, baseline);
            } catch (error) {
              for (let i = 0; i < fullText.length; i++) {
                maskContext.fillText(fullText.charAt(i), letterBounds[i].left, baseline);
              }
            }
          } else {
            /* Range-derived character starts preserve the browser's letter spacing. */
            for (let i = 0; i < fullText.length; i++) {
              maskContext.fillText(fullText.charAt(i), letterBounds[i].left, baseline);
            }
          }

          return {
            image: maskContext.getImageData(0, 0, maskCanvas.width, maskCanvas.height),
            dpr,
            width,
            height
          };
        }

        function collectDots(maskInfo, step, maxDots, paddingX, paddingY) {
          const outputX = [];
          const outputY = [];
          const outputLetters = [];
          const data = maskInfo.image.data;
          const pixelWidth = maskCanvas.width;
          const dpr = maskInfo.dpr;

          for (let y = step * 0.5; y < maskInfo.height; y += step) {
            const pixelY = clamp(Math.round(y * dpr), 0, maskCanvas.height - 1);
            for (let x = step * 0.5; x < maskInfo.width; x += step) {
              const pixelX = clamp(Math.round(x * dpr), 0, pixelWidth - 1);
              const alphaIndex = (pixelY * pixelWidth + pixelX) * 4 + 3;
              if (data[alphaIndex] < 70) continue;

              let letterIndex = -1;
              for (let i = 0; i < letterBounds.length; i++) {
                if (x >= letterBounds[i].left - 1 && x <= letterBounds[i].right + 1) {
                  letterIndex = i;
                  break;
                }
              }
              if (letterIndex < 0) {
                let nearestDistance = Infinity;
                for (let i = 0; i < letterBounds.length; i++) {
                  const distance = Math.abs(x - letterBounds[i].center);
                  if (distance < nearestDistance) {
                    nearestDistance = distance;
                    letterIndex = i;
                  }
                }
              }

              outputX.push(paddingX + x);
              outputY.push(paddingY + y);
              outputLetters.push(letterIndex);
            }
          }

          return { x: outputX, y: outputY, letters: outputLetters };
        }

        function resetDotPhysics(finalStatic) {
          letterHasSpawned.fill(0);
          letterSpawnTimes.fill(0);
          dotVX.fill(0);
          dotVY.fill(0);
          dotNearCursor.fill(0);
          const count = finalStatic ? fullText.length : getRevealCount(animationElapsedMs);
          revealCount = count;

          for (let i = 0; i < dotCount; i++) {
            const letter = dotLetterIndex[i];
            dotX[i] = homeX[i];
            dotY[i] = homeY[i];
            if (finalStatic || letter < count) {
              letterHasSpawned[letter] = 1;
              letterSpawnTimes[letter] = finalStatic
                ? 0
                : Math.max(0, SPAWN_DELAY_MS + letter * LETTER_INTERVAL_MS);
            }
          }
        }

        function buildBucketGroups() {
          bucketGroups = Array.from(
            { length: fullText.length },
            () => Array.from({ length: COLOR_BUCKET_COUNT }, () => [])
          );
          for (let i = 0; i < dotCount; i++) {
            const letter = clamp(Math.floor(dotLetterIndex[i]), 0, fullText.length - 1);
            bucketGroups[letter][dotBaseBucket[i]].push(i);
          }
        }

        function setCanvasBackingSize() {
          const canvasRect = dotCanvas.getBoundingClientRect();
          canvasCssWidth = Math.max(1, canvasRect.width);
          canvasCssHeight = Math.max(1, canvasRect.height);
          canvasDpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
          dotCanvas.width = Math.max(1, Math.ceil(canvasCssWidth * canvasDpr));
          dotCanvas.height = Math.max(1, Math.ceil(canvasCssHeight * canvasDpr));
          dotContext.setTransform(canvasDpr, 0, 0, canvasDpr, 0, 0);
          dotContext.clearRect(0, 0, canvasCssWidth, canvasCssHeight);
        }

        function rebuildDots(preserveProgress = true) {
          if (!active || disposed) return;

          const textNode = sakshiText.firstChild;
          if (!textNode || textNode.nodeType !== Node.TEXT_NODE) {
            throw new Error("sAkshi text placeholder is unavailable");
          }

          const style = getComputedStyle(sakshiText);
          const spanRect = sakshiText.getBoundingClientRect();
          if (spanRect.width <= 0 || spanRect.height <= 0) {
            throw new Error("sAkshi text has no measurable size");
          }

          fontSizePx = parseFloat(style.fontSize) || 100;
          textWidth = spanRect.width;
          letterBounds = getCharacterBounds(spanRect, textNode);
          letterRightOffsets = new Float32Array(fullText.length);
          for (let i = 0; i < fullText.length; i++) {
            letterRightOffsets[i] = letterBounds[i].right - spanRect.left + fontSizePx * 0.08;
          }

          setCanvasBackingSize();
          const maskInfo = drawMask(spanRect, style, textNode);
          const stepBase = window.innerWidth < 768
            ? BASE_DOT_STEP_MOBILE
            : BASE_DOT_STEP_DESKTOP;
          let step = Math.max(1.5, stepBase * fontSizePx / 100);
          const maxDots = window.innerWidth < 768 ? MOBILE_DOT_CAP : DESKTOP_DOT_CAP;
          const paddingX = spanRect.left - dotCanvas.getBoundingClientRect().left;
          const paddingY = spanRect.top - dotCanvas.getBoundingClientRect().top;
          let sampled = collectDots(maskInfo, step, maxDots, paddingX, paddingY);
          let attempts = 0;
          while (sampled.x.length > maxDots && attempts < 8) {
            step *= Math.sqrt(sampled.x.length / maxDots) * 1.04;
            sampled = collectDots(maskInfo, step, maxDots, paddingX, paddingY);
            attempts++;
          }
          if (!sampled.x.length) {
            throw new Error("Could not sample any sAkshi glyph dots");
          }

          currentDotStep = step;
          dotCount = sampled.x.length;
          homeX = new Float32Array(dotCount);
          homeY = new Float32Array(dotCount);
          dotX = new Float32Array(dotCount);
          dotY = new Float32Array(dotCount);
          dotVX = new Float32Array(dotCount);
          dotVY = new Float32Array(dotCount);
          dotLetterIndex = new Float32Array(dotCount);
          dotBaseBucket = new Uint8Array(dotCount);
          dotNearCursor = new Float32Array(dotCount);
          baseDotRadius = currentDotStep * DOT_RADIUS_FACTOR;
          repelRadius = clamp(fontSizePx * REPEL_RADIUS_SCALE, REPEL_RADIUS_MIN, REPEL_RADIUS_MAX);

          for (let i = 0; i < dotCount; i++) {
            homeX[i] = sampled.x[i];
            homeY[i] = sampled.y[i];
            dotX[i] = sampled.x[i];
            dotY[i] = sampled.y[i];
            dotLetterIndex[i] = sampled.letters[i];
            const relativeX = clamp((sampled.x[i] - paddingX) / Math.max(textWidth, 1), 0, 0.9999);
            dotBaseBucket[i] = Math.floor(relativeX * COLOR_BUCKET_COUNT);
          }

          buildBucketGroups();
          resetDotPhysics(reducedMotion || !preserveProgress);
          if (!reducedMotion && preserveProgress) {
            revealCount = getRevealCount(animationElapsedMs);
          } else if (!reducedMotion && !preserveProgress) {
            animationElapsedMs = 0;
            revealCount = 0;
            resetDotPhysics(false);
          }
          positionTypingCursor(revealCount);
          drawDots(animationElapsedMs);
        }

        function positionTypingCursor(count) {
          if (!active) return;
          const left = count <= 0 ? 0 : letterRightOffsets[Math.min(count, fullText.length) - 1];
          typingCursor.style.left = `${Math.max(0, left)}px`;
        }

        function spawnLetter(letterIndex, elapsedMs) {
          letterHasSpawned[letterIndex] = 1;
          letterSpawnTimes[letterIndex] = elapsedMs;
          for (let i = 0; i < dotCount; i++) {
            if (dotLetterIndex[i] !== letterIndex) continue;
            const angle = Math.random() * Math.PI * 2;
            const distance = 40 + Math.random() * 80;
            dotX[i] = homeX[i] + Math.cos(angle) * distance;
            dotY[i] = homeY[i] + Math.sin(angle) * distance;
            dotVX[i] = 0;
            dotVY[i] = 0;
          }
        }

        function updateDots(elapsedMs, deltaTime) {
          const nextRevealCount = getRevealCount(elapsedMs);
          if (nextRevealCount > revealCount) {
            for (let letter = revealCount; letter < nextRevealCount; letter++) {
              if (!letterHasSpawned[letter]) {
                spawnLetter(letter, elapsedMs);
              }
            }
          }
          revealCount = nextRevealCount;
          positionTypingCursor(revealCount);

          const pointerEnabled = pointerActive && !reducedMotion;
          for (let i = 0; i < dotCount; i++) {
            const letter = Math.floor(dotLetterIndex[i]);
            if (letter >= revealCount) {
              dotNearCursor[i] = 0;
              continue;
            }

            if (reducedMotion) {
              dotX[i] = homeX[i];
              dotY[i] = homeY[i];
              dotVX[i] = 0;
              dotVY[i] = 0;
              dotNearCursor[i] = 0;
              continue;
            }

            let targetX = homeX[i];
            let targetY = homeY[i];
            let proximity = 0;

            if (pointerEnabled) {
              const dx = dotX[i] - pointerX;
              const dy = dotY[i] - pointerY;
              const distance = Math.sqrt(dx * dx + dy * dy);
              if (distance < repelRadius) {
                proximity = 1 - distance / repelRadius;
                const falloff = proximity * proximity;
                const edgeLimit = Math.max(0, Math.min(
                  repelRadius * REPEL_STRENGTH,
                  homeX[i] - baseDotRadius,
                  canvasCssWidth - homeX[i] - baseDotRadius,
                  homeY[i] - baseDotRadius,
                  canvasCssHeight - homeY[i] - baseDotRadius
                ));
                const pushDistance = edgeLimit * falloff;
                const safeDistance = Math.max(distance, 0.001);
                targetX += (dx / safeDistance) * pushDistance;
                targetY += (dy / safeDistance) * pushDistance;
              }
            }

            dotNearCursor[i] = proximity;
            dotVX[i] = (dotVX[i] + (targetX - dotX[i]) * SPRING_K) * DAMPING;
            dotVY[i] = (dotVY[i] + (targetY - dotY[i]) * SPRING_K) * DAMPING;
            dotX[i] += dotVX[i];
            dotY[i] += dotVY[i];
          }
        }

        function getLetterOpacity(letterIndex, elapsedMs) {
          if (reducedMotion) return 1;
          const age = elapsedMs - letterSpawnTimes[letterIndex];
          return smoothstep01(age / SPAWN_DURATION_MS);
        }

        function drawDots(elapsedMs) {
          if (!dotContext || !dotCount) return;
          dotContext.clearRect(0, 0, canvasCssWidth, canvasCssHeight);
          const colorShift = reducedMotion
            ? 0
            : Math.floor((((elapsedMs / 1000) * SHIMMER_SPEED) % 1) * COLOR_BUCKET_COUNT);

          for (let letter = 0; letter < revealCount; letter++) {
            const alpha = getLetterOpacity(letter, elapsedMs);
            if (alpha <= 0) continue;
            dotContext.globalAlpha = alpha;

            for (let baseBucket = 0; baseBucket < COLOR_BUCKET_COUNT; baseBucket++) {
              const indices = bucketGroups[letter][baseBucket];
              if (!indices.length) continue;
              const actualBucket = (baseBucket + colorShift) % COLOR_BUCKET_COUNT;
              dotContext.fillStyle = palette[actualBucket];
              dotContext.beginPath();
              for (let j = 0; j < indices.length; j++) {
                const i = indices[j];
                const radius = baseDotRadius * (1 + 0.3 * dotNearCursor[i]);
                dotContext.moveTo(dotX[i] + radius, dotY[i]);
                dotContext.arc(dotX[i], dotY[i], radius, 0, Math.PI * 2);
              }
              dotContext.fill();
            }
          }
          dotContext.globalAlpha = 1;
        }

        function renderFrame(now) {
          animationFrameId = 0;
          if (disposed || !active || !heroIsVisible || !tabIsVisible || reducedMotion) return;

          const deltaTime = lastFrameTime
            ? Math.min(0.05, Math.max(0, (now - lastFrameTime) / 1000))
            : 0;
          lastFrameTime = now;
          animationElapsedMs += deltaTime * 1000;
          updateDots(animationElapsedMs, deltaTime);
          drawDots(animationElapsedMs);
          animationFrameId = window.requestAnimationFrame(renderFrame);
        }

        function syncLoop() {
          if (disposed || !active) return;
          const shouldRun = heroIsVisible && tabIsVisible && !reducedMotion;
          if (shouldRun && animationFrameId === 0) {
            lastFrameTime = 0;
            animationFrameId = window.requestAnimationFrame(renderFrame);
          } else if (!shouldRun && animationFrameId !== 0) {
            window.cancelAnimationFrame(animationFrameId);
            animationFrameId = 0;
          }
          if (reducedMotion) {
            revealCount = fullText.length;
            for (let letter = 0; letter < fullText.length; letter++) {
              letterHasSpawned[letter] = 1;
              letterSpawnTimes[letter] = 0;
            }
            for (let i = 0; i < dotCount; i++) {
              dotX[i] = homeX[i];
              dotY[i] = homeY[i];
              dotVX[i] = 0;
              dotVY[i] = 0;
              dotNearCursor[i] = 0;
            }
            positionTypingCursor(fullText.length);
            drawDots(0);
          }
        }

        function handlePointerMove(event) {
          if (disposed || !active) return;
          const isMobile = window.innerWidth < 768;
          if (isMobile) {
            if (event.pointerType !== "touch" || !touchActive) {
              pointerActive = false;
              return;
            }
          } else if (event.pointerType === "touch") {
            pointerActive = false;
            return;
          }

          const panelRect = document.querySelector(".vanta-panel").getBoundingClientRect();
          const insidePanel =
            event.clientX >= panelRect.left && event.clientX <= panelRect.right &&
            event.clientY >= panelRect.top && event.clientY <= panelRect.bottom;
          if (!insidePanel) {
            pointerActive = false;
            return;
          }

          const canvasRect = dotCanvas.getBoundingClientRect();
          pointerX = event.clientX - canvasRect.left;
          pointerY = event.clientY - canvasRect.top;
          pointerActive = true;
          lastPointerTime = performance.now();
        }

        function handlePointerDown(event) {
          if (window.innerWidth < 768 && event.pointerType === "touch") {
            touchActive = true;
            handlePointerMove(event);
          }
        }

        function handlePointerUp(event) {
          if (event.pointerType === "touch") {
            touchActive = false;
            pointerActive = false;
          }
        }

        function handlePointerLeavePanel() {
          pointerActive = false;
          touchActive = false;
        }

        function handleVisibilityChange() {
          tabIsVisible = document.visibilityState === "visible";
          syncLoop();
        }

        function handleWindowResize() {
          window.clearTimeout(resizeTimer);
          resizeTimer = window.setTimeout(() => {
            try {
              rebuildDots(true);
            } catch (error) {
              fallbackFromDots();
            }
          }, 150);
        }

        function handleMotionPreferenceChange(event) {
          reducedMotion = event.matches;
          if (!active) {
            startFallbackTypewriter();
            return;
          }
          clearFallbackTimers();
          if (reducedMotion) {
            pointerActive = false;
            touchActive = false;
            revealCount = fullText.length;
            resetDotPhysics(true);
            drawDots(0);
            syncLoop();
          } else {
            animationElapsedMs = 0;
            revealCount = 0;
            pointerActive = false;
            touchActive = false;
            resetDotPhysics(false);
            syncLoop();
          }
        }

        function fallbackFromDots() {
          active = false;
          sakshiLine.classList.remove("dots-active");
          dotCanvas.style.display = "none";
          clearFallbackTimers();
          startFallbackTypewriter();
        }

        function cleanup() {
          if (disposed) return;
          disposed = true;
          if (animationFrameId) {
            window.cancelAnimationFrame(animationFrameId);
            animationFrameId = 0;
          }
          window.clearTimeout(resizeTimer);
          clearFallbackTimers();
          window.removeEventListener("pointermove", handlePointerMove);
          window.removeEventListener("pointerdown", handlePointerDown);
          window.removeEventListener("pointerup", handlePointerUp);
          window.removeEventListener("pointercancel", handlePointerUp);
          document.removeEventListener("visibilitychange", handleVisibilityChange);
          document.querySelector(".vanta-panel")?.removeEventListener("pointerleave", handlePointerLeavePanel);
          window.removeEventListener("resize", handleWindowResize);
          if (resizeObserver) resizeObserver.disconnect();
          if (intersectionObserver) intersectionObserver.disconnect();
          if (motionQuery.removeEventListener) {
            motionQuery.removeEventListener("change", handleMotionPreferenceChange);
          } else if (motionQuery.removeListener) {
            motionQuery.removeListener(handleMotionPreferenceChange);
          }
          window.removeEventListener("pagehide", cleanup);
          window.removeEventListener("beforeunload", cleanup);
        }

        function activateDots() {
          if (disposed) return false;
          dotContext = dotCanvas.getContext("2d", { alpha: true });
          maskCanvas = document.createElement("canvas");
          maskContext = maskCanvas.getContext("2d", { alpha: true, willReadFrequently: true });
          if (!dotContext || !maskContext) return false;

          sakshiLine.classList.add("dots-active");
          dotCanvas.style.display = "block";
          active = true;
          palette = makePalette();

          try {
            rebuildDots(false);
            active = true;
            sakshiLine.classList.remove("dots-pending");
            if (reducedMotion) {
              animationElapsedMs = 0;
              resetDotPhysics(true);
              revealCount = fullText.length;
              positionTypingCursor(revealCount);
              drawDots(0);
            } else {
              animationElapsedMs = 0;
              revealCount = 0;
              resetDotPhysics(false);
              positionTypingCursor(0);
              syncLoop();
            }
            return true;
          } catch (error) {
            active = false;
            sakshiLine.classList.remove("dots-active");
            dotCanvas.style.display = "none";
            return false;
          }
        }

        function start() {
          if (disposed) return;
          const fontsReady = document.fonts && document.fonts.ready
            ? document.fonts.ready
            : Promise.resolve();
          fontsReady.then(() => {
            if (disposed) return;
            if (!activateDots()) startFallbackTypewriter();
          }).catch(() => startFallbackTypewriter());

          window.addEventListener("pointermove", handlePointerMove, { passive: true });
          window.addEventListener("pointerdown", handlePointerDown, { passive: true });
          window.addEventListener("pointerup", handlePointerUp, { passive: true });
          window.addEventListener("pointercancel", handlePointerUp, { passive: true });
          window.addEventListener("resize", handleWindowResize, { passive: true });
          document.addEventListener("visibilitychange", handleVisibilityChange);
          document.querySelector(".vanta-panel").addEventListener("pointerleave", handlePointerLeavePanel, { passive: true });
          if (motionQuery.addEventListener) {
            motionQuery.addEventListener("change", handleMotionPreferenceChange);
          } else if (motionQuery.addListener) {
            motionQuery.addListener(handleMotionPreferenceChange);
          }
          if ("ResizeObserver" in window) {
            resizeObserver = new ResizeObserver(() => handleWindowResize());
            resizeObserver.observe(sakshiText);
          }
          if ("IntersectionObserver" in window) {
            intersectionObserver = new IntersectionObserver((entries) => {
              heroIsVisible = entries.some((entry) => entry.isIntersecting);
              syncLoop();
            }, { threshold: 0.05 });
            intersectionObserver.observe(document.querySelector(".vanta-panel"));
          }
          window.addEventListener("pagehide", cleanup, { once: true });
          window.addEventListener("beforeunload", cleanup, { once: true });
        }

        palette = makePalette();
        onMotionChange = handleMotionPreferenceChange;
        start();
        return cleanup;
      
    })();

    return dispose;
  }, []);

  return (
    <span className="sakshi-line dots-pending" aria-label="sAkshI">
      <span id="sakshi-text" className="sakshi-text" aria-label="sAkshI">sAkshI</span>
      <canvas id="sakshi-dots" aria-hidden="true" />
      <span className="typing-cursor" aria-hidden="true" />
    </span>
  );
}
