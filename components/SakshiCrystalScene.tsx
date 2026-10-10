'use client';

import { useEffect, useRef, type RefObject } from 'react';
import * as THREE from 'three';

type SakshiCrystalSceneProps = {
  heroPanelRef: RefObject<HTMLElement | null>;
};

export default function SakshiCrystalScene({ heroPanelRef }: SakshiCrystalSceneProps) {
  const sceneHostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const heroPanel = heroPanelRef.current;
    const sceneHost = sceneHostRef.current;
    if (!heroPanel || !sceneHost) return;

    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      let renderer;
      let scene;
      let camera;
      let rootGroup;
      let crystal;
      let crystalMaterial;
      let innerGlow;
      let innerGlowMaterial;
      let coreLight;
      let cursorLight;
      let cursorGlowSprite;
      let cursorGlowMaterial;
      let shell;
      let shellMaterial;
      let shellGeometry;
      let ringParticles = [];
      let ringGroups = [];
      let shellBasePositions = new Float32Array(0);
      let repelX = new Float32Array(0);
      let repelY = new Float32Array(0);
      let repelZ = new Float32Array(0);
      let particleCount = 0;
      let isMobile = window.innerWidth < 768;
      let reducedMotion = reducedMotionQuery.matches;
      let heroIsVisible = true;
      let tabIsVisible = document.visibilityState === "visible";
      let animationFrameId = 0;
      let elapsed = 0;
      let lastFrameTime = 0;
      let progress = 0;
      let disposed = false;
      let pointerInScene = false;
      const pointerNdc = new THREE.Vector2(0, 0);
      const pointerWorld = new THREE.Vector3(0, 0, 0);
      const pointerLocal = new THREE.Vector3(0, 0, 0);
      const pointerRaycaster = new THREE.Raycaster();
      const scenePlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
      const DESKTOP_PARTICLE_COUNT = 3000;
      const MOBILE_PARTICLE_COUNT = 1200;
      const GLOW_COLOR = 0x6ee7b7;
      const PURPLE_PARTICLE_COLOR = 0xb5a7ff;
      const MAX_TILT_DEGREES = 15;
      const maxTilt = THREE.MathUtils.degToRad(MAX_TILT_DEGREES);
      const targetRotation = new THREE.Vector2(0, 0);
      const glowColor = new THREE.Color(GLOW_COLOR);
      const purpleColor = new THREE.Color(PURPLE_PARTICLE_COLOR);
      const ringDefinitions = [
        { radius: 1.45, tiltX: 0.75, tiltY: 0.24, speed: 0.30, color: GLOW_COLOR, opacity: 0.34 },
        { radius: 1.74, tiltX: 1.05, tiltY: -0.62, speed: -0.22, color: 0xa69aff, opacity: 0.29 },
        { radius: 2.03, tiltX: 0.38, tiltY: 0.82, speed: 0.16, color: 0x16b983, opacity: 0.23 }
      ];

      const smoothstep = (edge0, edge1, value) => {
        const t = THREE.MathUtils.clamp((value - edge0) / (edge1 - edge0), 0, 1);
        return t * t * (3 - 2 * t);
      };

      function initScene() {
        try {
          renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true,
            powerPreference: "high-performance"
          });
        } catch (error) {
          // Leave the existing hero and CSS nebula untouched if WebGL is unavailable.
          return;
        }

        renderer.setPixelRatio(Math.min(2, Math.max(1, window.devicePixelRatio || 1)));
        renderer.setClearColor(0x000000, 0);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.domElement.setAttribute("aria-hidden", "true");
        sceneHost.appendChild(renderer.domElement);

        scene = new THREE.Scene();
        const bounds = sceneHost.getBoundingClientRect();
        camera = new THREE.PerspectiveCamera(
          45,
          Math.max(bounds.width, 1) / Math.max(bounds.height, 1),
          0.1,
          60
        );
        camera.position.set(0, 0, 7.5);

        scene.add(new THREE.AmbientLight(0x7c83a9, 0.35));
        cursorLight = new THREE.PointLight(GLOW_COLOR, 0, 5.2, 2);
        scene.add(cursorLight);

        cursorGlowMaterial = new THREE.ShaderMaterial({
          uniforms: {
            uIntensity: { value: 0 },
            uGlowColor: { value: new THREE.Color(GLOW_COLOR) }
          },
          vertexShader: `
            varying vec2 vUv;
            void main() {
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `,
          fragmentShader: `
            uniform float uIntensity;
            uniform vec3 uGlowColor;
            varying vec2 vUv;
            void main() {
              float distanceFromCenter = length(vUv - 0.5) * 2.0;
              float halo = exp(-distanceFromCenter * distanceFromCenter * 5.0);
              float core = exp(-distanceFromCenter * distanceFromCenter * 24.0);
              float alpha = (halo * 0.16 + core * 0.2) * uIntensity;
              gl_FragColor = vec4(uGlowColor, alpha);
              #include <tonemapping_fragment>
              #include <colorspace_fragment>
            }
          `,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending
        });
        cursorGlowSprite = new THREE.Mesh(new THREE.PlaneGeometry(1.35, 1.35), cursorGlowMaterial);
        cursorGlowSprite.position.z = 1.5;
        cursorGlowSprite.frustumCulled = false;
        scene.add(cursorGlowSprite);

        rootGroup = new THREE.Group();
        rootGroup.position.set(0, isMobile ? -0.72 : 0, 0);
        rootGroup.scale.setScalar(isMobile ? 0.72 : 0.98);
        scene.add(rootGroup);

        createCrystal();
        createParticleShell();
        createRings();
        resizeScene();
        addSceneListeners();
        syncRenderLoop();
      }

      function createCrystal() {
        const crystalGeometry = new THREE.IcosahedronGeometry(1.02, 1);
        crystalMaterial = new THREE.ShaderMaterial({
          uniforms: {
            uTime: { value: 0 },
            uGlow: { value: 0 },
            uVisibility: { value: 0 },
            uCursorLocal: { value: new THREE.Vector2(100, 100) },
            uCursorStrength: { value: 0 },
            uGlowColor: { value: new THREE.Color(GLOW_COLOR) },
            uReducedMotion: { value: reducedMotion ? 1 : 0 }
          },
          vertexShader: `
            varying vec3 vNormal;
            varying vec3 vViewPosition;
            varying vec3 vLocalPosition;
            void main() {
              vNormal = normalize(normalMatrix * normal);
              vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
              vViewPosition = -mvPosition.xyz;
              vLocalPosition = position;
              gl_Position = projectionMatrix * mvPosition;
            }
          `,
          fragmentShader: `
            uniform float uTime;
            uniform float uGlow;
            uniform float uVisibility;
            uniform vec2 uCursorLocal;
            uniform float uCursorStrength;
            uniform vec3 uGlowColor;
            uniform float uReducedMotion;
            varying vec3 vNormal;
            varying vec3 vViewPosition;
            varying vec3 vLocalPosition;

            void main() {
              vec3 normal = normalize(vNormal);
              vec3 viewDirection = normalize(vViewPosition);
              float fresnel = pow(1.0 - max(dot(normal, viewDirection), 0.0), 2.4);

              float envGradient = smoothstep(-0.9, 0.85, normal.y + normal.x * 0.22);
              vec3 envTop = vec3(0.035, 0.105, 0.095);
              vec3 envBottom = vec3(0.006, 0.014, 0.026);
              vec3 baseColor = mix(envBottom, envTop, envGradient);

              float pulse = mix(1.0, 0.88 + 0.12 * sin(uTime * 1.25), 1.0 - uReducedMotion);
              float cursorBloom = exp(-length(vLocalPosition.xy - uCursorLocal) * 1.65) * uCursorStrength;
              float edgeStrength = fresnel * (0.22 + 0.8 * uGlow + cursorBloom * 1.7);
              float innerWave = 0.5 + 0.5 * sin(vLocalPosition.x * 5.0 + vLocalPosition.y * 4.0 + uTime * 0.75);
              vec3 greenEdge = uGlowColor * edgeStrength;
              vec3 internalGlow = uGlowColor * 0.28 * uGlow * (0.22 + innerWave * 0.25) * pulse;
              vec3 color = baseColor + greenEdge + internalGlow;

              gl_FragColor = vec4(color, (0.84 + min(fresnel * 0.15, 0.15)) * uVisibility);
              #include <tonemapping_fragment>
              #include <colorspace_fragment>
            }
          `,
          transparent: true,
          depthWrite: false,
          side: THREE.DoubleSide
        });

        crystal = new THREE.Mesh(crystalGeometry, crystalMaterial);
        crystal.rotation.set(0.12, -0.18, 0.04);
        rootGroup.add(crystal);

        const innerGeometry = new THREE.IcosahedronGeometry(0.62, 1);
        innerGlowMaterial = new THREE.MeshBasicMaterial({
          color: GLOW_COLOR,
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        });
        innerGlow = new THREE.Mesh(innerGeometry, innerGlowMaterial);
        rootGroup.add(innerGlow);

        coreLight = new THREE.PointLight(GLOW_COLOR, 0, 3.4, 2);
        coreLight.position.set(0, 0, 0.15);
        rootGroup.add(coreLight);
      }

      function buildShellGeometry(count) {
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);

        for (let i = 0; i < count; i++) {
          const z = Math.random() * 2 - 1;
          const angle = Math.random() * Math.PI * 2;
          const planarRadius = Math.sqrt(1 - z * z);
          const radius = 1.52 + Math.random() * 0.57;
          const index = i * 3;

          positions[index] = planarRadius * Math.cos(angle) * radius;
          positions[index + 1] = planarRadius * Math.sin(angle) * radius;
          positions[index + 2] = z * radius;

          const color = Math.random() < 0.7 ? glowColor : purpleColor;
          colors[index] = color.r;
          colors[index + 1] = color.g;
          colors[index + 2] = color.b;
        }


        const geometry = new THREE.BufferGeometry();

        const positionAttribute = new THREE.BufferAttribute(positions, 3);
        positionAttribute.setUsage(THREE.DynamicDrawUsage);

        geometry.setAttribute("position", positionAttribute);
        geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

        shellBasePositions = new Float32Array(positions);
        repelX = new Float32Array(count);
        repelY = new Float32Array(count);
        repelZ = new Float32Array(count);
        return geometry;
      }

      function createParticleShell() {
        particleCount = isMobile ? MOBILE_PARTICLE_COUNT : DESKTOP_PARTICLE_COUNT;
        shellGeometry = buildShellGeometry(particleCount);
        shellMaterial = new THREE.PointsMaterial({
          size: isMobile ? 0.023 : 0.019,
          vertexColors: true,
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          sizeAttenuation: true
        });
        shell = new THREE.Points(shellGeometry, shellMaterial);
        rootGroup.add(shell);
      }

      function rebuildParticleShell() {
        if (!shell || !shellMaterial) return;
        const nextCount = isMobile ? MOBILE_PARTICLE_COUNT : DESKTOP_PARTICLE_COUNT;
        if (nextCount === particleCount) return;

        const newGeometry = buildShellGeometry(nextCount);
        shell.geometry.dispose();
        shell.geometry = newGeometry;
        shellGeometry = newGeometry;
        particleCount = nextCount;
        shellMaterial.size = isMobile ? 0.023 : 0.019;
      }

      function createRings() {
        const ringGeometry = new THREE.TorusGeometry(1, 0.0045, 6, 180);
        const orbitDotGeometry = new THREE.SphereGeometry(0.032, 8, 8);

        ringDefinitions.forEach((definition, ringIndex) => {
          const ringGroup = new THREE.Group();
          ringGroup.rotation.set(definition.tiltX, definition.tiltY, 0);
          ringGroup.userData.speed = definition.speed;
          ringGroup.userData.radius = definition.radius;
          ringGroup.userData.baseOpacity = definition.opacity;

          const ringMaterial = new THREE.MeshBasicMaterial({
            color: definition.color,
            transparent: true,
            opacity: 0,
            blending: THREE.AdditiveBlending,
            depthWrite: false
          });
          const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
          ringMesh.scale.setScalar(definition.radius);
          ringGroup.add(ringMesh);

          const dotMaterial = new THREE.MeshBasicMaterial({
            color: definition.color,
            transparent: true,
            opacity: 0,
            blending: THREE.AdditiveBlending,
            depthWrite: false
          });

          for (let dotIndex = 0; dotIndex < 2; dotIndex++) {
            const dot = new THREE.Mesh(orbitDotGeometry, dotMaterial);
            const phase = dotIndex * Math.PI + ringIndex * 0.7;
            dot.userData.phase = phase;
            dot.userData.radius = definition.radius;
            dot.userData.speed = definition.speed * (dotIndex === 0 ? 1 : -0.82);
            dot.position.set(
              Math.cos(phase) * definition.radius,
              Math.sin(phase) * definition.radius,
              0
            );
            ringGroup.add(dot);
            ringParticles.push({ mesh: dot, material: dotMaterial });
          }

          ringGroups.push(ringGroup);
          rootGroup.add(ringGroup);
        });
      }

      function resizeScene() {
        if (!renderer || !camera || disposed) return;
        const bounds = sceneHost.getBoundingClientRect();
        const width = Math.max(1, bounds.width);
        const height = Math.max(1, bounds.height);

        renderer.setPixelRatio(Math.min(2, Math.max(1, window.devicePixelRatio || 1)));
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();

        const nextMobile = window.innerWidth < 768;
        if (nextMobile !== isMobile) {
          isMobile = nextMobile;
          rebuildParticleShell();
        }

        rootGroup.scale.setScalar(isMobile ? 0.72 : 0.98);
        rootGroup.position.y = isMobile ? -0.72 : 0;
      }

      function handlePointerMove(event) {
        const panelBounds = heroPanel.getBoundingClientRect();
        const panelX = (event.clientX - panelBounds.left) / Math.max(panelBounds.width, 1);
        const panelY = (event.clientY - panelBounds.top) / Math.max(panelBounds.height, 1);
        targetRotation.x = reducedMotion ? 0 : THREE.MathUtils.clamp((panelY - 0.5) * 2, -1, 1) * maxTilt;
        targetRotation.y = reducedMotion ? 0 : THREE.MathUtils.clamp((panelX - 0.5) * 2, -1, 1) * maxTilt;

        const sceneBounds = sceneHost.getBoundingClientRect();
        pointerInScene =
          event.clientX >= sceneBounds.left && event.clientX <= sceneBounds.right &&
          event.clientY >= sceneBounds.top && event.clientY <= sceneBounds.bottom;

        if (pointerInScene) {
          pointerNdc.x = ((event.clientX - sceneBounds.left) / Math.max(sceneBounds.width, 1)) * 2 - 1;
          pointerNdc.y = -((event.clientY - sceneBounds.top) / Math.max(sceneBounds.height, 1)) * 2 + 1;
          pointerRaycaster.setFromCamera(pointerNdc, camera);
          pointerRaycaster.ray.intersectPlane(scenePlane, pointerWorld);
        }
      }

      function handlePointerLeave() {
        pointerInScene = false;
        targetRotation.set(0, 0);
      }

      function handleVisibilityChange() {
        tabIsVisible = document.visibilityState === "visible";
        syncRenderLoop();
      }

      function handleMotionPreferenceChange(event) {
        reducedMotion = event.matches;
        if (crystalMaterial) {
          crystalMaterial.uniforms.uReducedMotion.value = reducedMotion ? 1 : 0;
        }
        targetRotation.set(0, 0);
      }

      function addSceneListeners() {
        window.addEventListener("resize", resizeScene, { passive: true });
        heroPanel.addEventListener("pointermove", handlePointerMove, { passive: true });
        heroPanel.addEventListener("pointerleave", handlePointerLeave, { passive: true });
        document.addEventListener("visibilitychange", handleVisibilityChange);

        if (reducedMotionQuery.addEventListener) {
          reducedMotionQuery.addEventListener("change", handleMotionPreferenceChange);
        } else if (reducedMotionQuery.addListener) {
          reducedMotionQuery.addListener(handleMotionPreferenceChange);
        }

        if ("IntersectionObserver" in window) {
          observer = new IntersectionObserver((entries) => {
            heroIsVisible = entries.some((entry) => entry.isIntersecting);
            syncRenderLoop();
          }, { threshold: 0.05 });
          observer.observe(heroPanel);
        }
      }

      let observer = null;

      function syncRenderLoop() {
        if (disposed || !renderer) return;
        const shouldRun = heroIsVisible && tabIsVisible;
        if (shouldRun && animationFrameId === 0) {
          lastFrameTime = performance.now();
          animationFrameId = requestAnimationFrame(renderFrame);
        } else if (!shouldRun && animationFrameId !== 0) {
          cancelAnimationFrame(animationFrameId);
          animationFrameId = 0;
        }
      }

      function updateShell(progressValue, deltaTime) {
        const contraction = smoothstep(0.33, 0.83, progressValue);
        const spread = reducedMotion ? 1 : THREE.MathUtils.lerp(1.72, 1.0, contraction);
        const positions = shellGeometry.attributes.position.array;
        const cursorShellLocal = pointerLocal.clone().applyQuaternion(shell.quaternion.clone().invert());
        const repulsionEnabled = pointerInScene && !reducedMotion;
        const radiusOfInfluence = 0.86;
        const repulsionStrength = 0.15;
        const easing = Math.min(1, deltaTime * 8.0);

        for (let i = 0; i < particleCount; i++) {
          const index = i * 3;
          const bx = shellBasePositions[index] * spread;
          const by = shellBasePositions[index + 1] * spread;
          const bz = shellBasePositions[index + 2] * spread;
          const dx = bx - cursorShellLocal.x;
          const dy = by - cursorShellLocal.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          let targetX = 0;
          let targetY = 0;
          let targetZ = 0;

          if (repulsionEnabled && distance < radiusOfInfluence) {
            const ratio = 1 - distance / radiusOfInfluence;
            const force = ratio * ratio * repulsionStrength;
            const safeDistance = Math.max(distance, 0.001);
            targetX = (dx / safeDistance) * force;
            targetY = (dy / safeDistance) * force;
            targetZ = (shellBasePositions[index + 2] / Math.max(Math.abs(shellBasePositions[index + 2]), 0.35)) * force * 0.25;
          }

          repelX[i] += (targetX - repelX[i]) * easing;
          repelY[i] += (targetY - repelY[i]) * easing;
          repelZ[i] += (targetZ - repelZ[i]) * easing;

          positions[index] = bx + repelX[i];
          positions[index + 1] = by + repelY[i];
          positions[index + 2] = bz + repelZ[i];
        }

        shellGeometry.attributes.position.needsUpdate = true;
        shellMaterial.opacity = reducedMotion ? progressValue : smoothstep(0.33, 0.83, progressValue);
      }

      function renderFrame(now) {
        animationFrameId = 0;
        if (disposed || !renderer || !heroIsVisible || !tabIsVisible) return;

        const deltaTime = Math.min(0.05, Math.max(0, (now - lastFrameTime) / 1000));
        lastFrameTime = now;
        elapsed += deltaTime;
        progress = THREE.MathUtils.clamp(elapsed / (reducedMotion ? 0.8 : 3.0), 0, 1);

        const glowRamp = reducedMotion ? progress : smoothstep(0.17, 0.5, progress);
        let flicker = 1;
        if (!reducedMotion) {
          const flickerDistance = Math.abs(progress - 0.4);
          const flickerShape = THREE.MathUtils.clamp(1 - flickerDistance / 0.02, 0, 1);
          flicker = 1 - 0.6 * flickerShape;
        }

        const pulse = reducedMotion ? 1 : 0.91 + 0.09 * Math.sin(elapsed * 1.25);
        const crystalGlow = glowRamp * flicker * pulse;
        crystalMaterial.uniforms.uTime.value = elapsed;
        crystalMaterial.uniforms.uGlow.value = crystalGlow;
        crystalMaterial.uniforms.uVisibility.value = reducedMotion
          ? progress
          : smoothstep(0.08, 0.3, progress);
        innerGlowMaterial.opacity = glowRamp * flicker * (reducedMotion ? 0.13 : 0.24);
        const innerPulse = reducedMotion ? 1 : 0.96 + 0.05 * Math.sin(elapsed * 1.1);
        innerGlow.scale.setScalar(innerPulse);
        coreLight.intensity = glowRamp * flicker * (isMobile ? 0.75 : 1.2);

        if (!reducedMotion) {
          const ramp = smoothstep(0.5, 1.0, progress);
          rootGroup.rotation.x += (targetRotation.x - rootGroup.rotation.x) * 0.05;
          rootGroup.rotation.y += (targetRotation.y - rootGroup.rotation.y) * 0.05;
          crystal.rotation.y += deltaTime * 0.11 * (isMobile ? 0.55 : 1);
          crystal.rotation.x += deltaTime * 0.035 * (isMobile ? 0.55 : 1);
          shell.rotation.y += deltaTime * (isMobile ? 0.025 : 0.045);

          ringGroups.forEach((ringGroup) => {
            ringGroup.rotation.z += deltaTime * ringGroup.userData.speed * ramp * (isMobile ? 0.55 : 1);
            (ringGroup.children[0] as THREE.Mesh).material &&
              (((ringGroup.children[0] as THREE.Mesh).material as THREE.Material).opacity =
                ringGroup.userData.baseOpacity * smoothstep(0.5, 1.0, progress));
          });

          ringParticles.forEach(({ mesh, material }) => {
            const angle = mesh.userData.phase + elapsed * mesh.userData.speed * ramp;
            mesh.position.set(
              Math.cos(angle) * mesh.userData.radius,
              Math.sin(angle) * mesh.userData.radius,
              0
            );
            material.opacity = 0.9 * ramp;
          });
        } else {
          rootGroup.rotation.x += (0 - rootGroup.rotation.x) * 0.05;
          rootGroup.rotation.y += (0 - rootGroup.rotation.y) * 0.05;
          ringGroups.forEach((ringGroup) => {
            (ringGroup.children[0] as THREE.Mesh).material &&
              (((ringGroup.children[0] as THREE.Mesh).material as THREE.Material).opacity =
                ringGroup.userData.baseOpacity * progress);
          });
          ringParticles.forEach(({ material }) => {
            material.opacity = 0.65 * progress;
          });
        }

        updateShell(progress, deltaTime);

        rootGroup.updateMatrixWorld(true);
        if (pointerInScene) {
          pointerLocal.copy(pointerWorld);
          rootGroup.worldToLocal(pointerLocal);
          const crystalLocalCursor = pointerLocal.clone().applyQuaternion(crystal.quaternion.clone().invert());
          crystalMaterial.uniforms.uCursorLocal.value.set(crystalLocalCursor.x, crystalLocalCursor.y);
          crystalMaterial.uniforms.uCursorStrength.value = isMobile ? 0.45 : 0.9;
          cursorLight.position.copy(pointerWorld);
          cursorLight.position.z = 1.2;
          cursorLight.intensity = isMobile || reducedMotion ? 0 : 1.05;
          cursorGlowSprite.position.set(pointerWorld.x, pointerWorld.y, 1.45);
          cursorGlowMaterial.uniforms.uIntensity.value = isMobile || reducedMotion ? 0 : 1;
        } else {
          crystalMaterial.uniforms.uCursorLocal.value.set(100, 100);
          crystalMaterial.uniforms.uCursorStrength.value = 0;
          cursorLight.intensity = 0;
          cursorGlowMaterial.uniforms.uIntensity.value = 0;
          pointerLocal.set(100, 100, 100);
        }

        if (reducedMotion) {
          cursorLight.intensity = 0;
          cursorGlowMaterial.uniforms.uIntensity.value = 0;
          crystalMaterial.uniforms.uCursorStrength.value = 0;
        }

        renderer.render(scene, camera);
        if (heroIsVisible && tabIsVisible && !disposed) {
          animationFrameId = requestAnimationFrame(renderFrame);
        }
      }

      function disposeScene() {
        if (disposed) return;
        disposed = true;

        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
          animationFrameId = 0;
        }

        if (observer) {
          observer.disconnect();
          observer = null;
        }

        window.removeEventListener("resize", resizeScene);
        heroPanel.removeEventListener("pointermove", handlePointerMove);
        heroPanel.removeEventListener("pointerleave", handlePointerLeave);
        document.removeEventListener("visibilitychange", handleVisibilityChange);

        if (reducedMotionQuery.removeEventListener) {
          reducedMotionQuery.removeEventListener("change", handleMotionPreferenceChange);
        } else if (reducedMotionQuery.removeListener) {
          reducedMotionQuery.removeListener(handleMotionPreferenceChange);
        }

        if (scene) {
          scene.traverse((object) => {
            const renderable = object as THREE.Mesh;
            if (renderable.geometry) renderable.geometry.dispose();
            if (renderable.material) {
              const materials = Array.isArray(renderable.material)
                ? renderable.material
                : [renderable.material];
              materials.forEach((material) => material.dispose());
            }
          });
        }

        if (renderer) {
          renderer.dispose();
          renderer.forceContextLoss();
          if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
      }

      initScene();
      return disposeScene;
  }, [heroPanelRef]);

  return <div id="sakshi-3d-scene" ref={sceneHostRef} className="sakshi-3d-scene" aria-hidden="true" />;
}
