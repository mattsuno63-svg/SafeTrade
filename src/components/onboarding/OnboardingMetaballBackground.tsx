'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'

interface OnboardingMetaballBackgroundProps {
  hideInWelcome?: boolean
}

export function OnboardingMetaballBackground({ hideInWelcome = false }: OnboardingMetaballBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const materialRef = useRef<THREE.ShaderMaterial | null>(null)
  const animationFrameRef = useRef<number>()

  useEffect(() => {
    if (!containerRef.current) return

    // Device detection
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    )
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
    const isLowPowerDevice = isMobile || (navigator.hardwareConcurrency || 4) <= 4
    const devicePixelRatio = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2)

    // Smaller spheres for onboarding - different positions
    const settings = {
      sphereCount: isMobile ? 2 : 4, // Fewer spheres
      ambientIntensity: 0.005,
      diffuseIntensity: 0.8,
      specularIntensity: 2.2,
      specularPower: 10,
      fresnelPower: 1.5,
      backgroundColor: new THREE.Color(0xfdfdfe),
      sphereColor: new THREE.Color(0xff6b35),
      lightColor: new THREE.Color(0xff6b35),
      lightPosition: new THREE.Vector3(1, 1, 1),
      smoothness: 0.3,
      contrast: 2.5,
      fogDensity: 0.08,
      cursorGlowIntensity: 0.8,
      cursorGlowRadius: 1.5,
      cursorGlowColor: new THREE.Color(0xff6b35),
      // Smaller radii for onboarding
      sphereRadius: 0.08, // Much smaller than homepage
      fixedTopLeftRadius: 0.4, // Smaller
      fixedBottomRightRadius: 0.45, // Smaller
      topRightRadius: 0.08,
      topRightSmallRadius: 0.06,
      bottomLeftRadius: 0.09,
      cursorRadiusMin: 0.06,
      cursorRadiusMax: 0.12,
      animationSpeed: 0.5,
      movementScale: 0.8, // Less movement
      mouseSmoothness: 0.1,
      mergeDistance: 1.5,
    }

    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10)
    camera.position.z = 1

    const renderer = new THREE.WebGLRenderer({
      antialias: !isMobile && !isLowPowerDevice,
      alpha: true,
      powerPreference: isMobile ? 'default' : 'high-performance',
      preserveDrawingBuffer: false,
      premultipliedAlpha: false,
    })

    const pixelRatio = Math.min(devicePixelRatio, isMobile ? 1.5 : 2)
    renderer.setPixelRatio(pixelRatio)
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setClearColor(0x000000, 0)
    renderer.outputColorSpace = THREE.SRGBColorSpace

    const canvas = renderer.domElement
    canvas.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      z-index: 0 !important;
      display: block !important;
      pointer-events: none !important;
      opacity: ${hideInWelcome ? '0' : '1'} !important;
      transition: opacity 0.5s ease-out !important;
    `
    containerRef.current.appendChild(canvas)
    rendererRef.current = renderer

    // Mouse tracking
    let cursorSphere3D = new THREE.Vector3(0, 0, 0)
    let targetMousePosition = new THREE.Vector2(0.5, 0.5)
    let mousePosition = new THREE.Vector2(0.5, 0.5)

    function screenToWorldJS(normalizedX: number, normalizedY: number) {
      const uv_x = normalizedX * 2.0 - 1.0
      const uv_y = normalizedY * 2.0 - 1.0
      const aspect = window.innerWidth / window.innerHeight
      return new THREE.Vector3(uv_x * aspect * 2.0, uv_y * 2.0, 0.0)
    }

    function onPointerMove(event: MouseEvent | TouchEvent) {
      let clientX: number, clientY: number
      if ('touches' in event && event.touches.length > 0) {
        clientX = event.touches[0].clientX
        clientY = event.touches[0].clientY
      } else if ('clientX' in event) {
        clientX = event.clientX
        clientY = event.clientY
      } else {
        return
      }

      targetMousePosition.x = clientX / window.innerWidth
      targetMousePosition.y = 1.0 - clientY / window.innerHeight

      const worldPos = screenToWorldJS(targetMousePosition.x, targetMousePosition.y)
      cursorSphere3D.copy(worldPos)

      if (materialRef.current) {
        materialRef.current.uniforms.uCursorSphere.value.copy(cursorSphere3D)
      }
    }

    // Shader material
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        uActualResolution: {
          value: new THREE.Vector2(
            window.innerWidth * pixelRatio,
            window.innerHeight * pixelRatio
          ),
        },
        uPixelRatio: { value: pixelRatio },
        uMousePosition: { value: new THREE.Vector2(0.5, 0.5) },
        uCursorSphere: { value: new THREE.Vector3(0, 0, 0) },
        uCursorRadius: { value: settings.cursorRadiusMin },
        uSphereCount: { value: settings.sphereCount },
        uFixedTopLeftRadius: { value: settings.fixedTopLeftRadius },
        uFixedBottomRightRadius: { value: settings.fixedBottomRightRadius },
        uTopRightRadius: { value: settings.topRightRadius },
        uTopRightSmallRadius: { value: settings.topRightSmallRadius },
        uBottomLeftRadius: { value: settings.bottomLeftRadius },
        uSphereRadius: { value: settings.sphereRadius },
        uMergeDistance: { value: settings.mergeDistance },
        uSmoothness: { value: settings.smoothness },
        uAmbientIntensity: { value: settings.ambientIntensity },
        uDiffuseIntensity: { value: settings.diffuseIntensity },
        uSpecularIntensity: { value: settings.specularIntensity },
        uSpecularPower: { value: settings.specularPower },
        uFresnelPower: { value: settings.fresnelPower },
        uBackgroundColor: { value: settings.backgroundColor },
        uSphereColor: { value: settings.sphereColor },
        uLightColor: { value: settings.lightColor },
        uLightPosition: { value: settings.lightPosition },
        uContrast: { value: settings.contrast },
        uFogDensity: { value: settings.fogDensity },
        uAnimationSpeed: { value: settings.animationSpeed },
        uMovementScale: { value: settings.movementScale },
        uCursorGlowIntensity: { value: settings.cursorGlowIntensity },
        uCursorGlowRadius: { value: settings.cursorGlowRadius },
        uCursorGlowColor: { value: settings.cursorGlowColor },
        uIsSafari: { value: isSafari ? 1.0 : 0.0 },
        uIsMobile: { value: isMobile ? 1.0 : 0.0 },
        uIsLowPower: { value: isLowPowerDevice ? 1.0 : 0.0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        ${isMobile || isSafari || isLowPowerDevice ? 'precision mediump float;' : 'precision highp float;'}
        
        uniform float uTime;
        uniform vec2 uResolution;
        uniform vec2 uActualResolution;
        uniform float uPixelRatio;
        uniform vec2 uMousePosition;
        uniform vec3 uCursorSphere;
        uniform float uCursorRadius;
        uniform int uSphereCount;
        uniform float uFixedTopLeftRadius;
        uniform float uFixedBottomRightRadius;
        uniform float uTopRightRadius;
        uniform float uTopRightSmallRadius;
        uniform float uBottomLeftRadius;
        uniform float uSphereRadius;
        uniform float uMergeDistance;
        uniform float uSmoothness;
        uniform float uAmbientIntensity;
        uniform float uDiffuseIntensity;
        uniform float uSpecularIntensity;
        uniform float uSpecularPower;
        uniform float uFresnelPower;
        uniform vec3 uBackgroundColor;
        uniform vec3 uSphereColor;
        uniform vec3 uLightColor;
        uniform vec3 uLightPosition;
        uniform float uContrast;
        uniform float uFogDensity;
        uniform float uAnimationSpeed;
        uniform float uMovementScale;
        uniform float uCursorGlowIntensity;
        uniform float uCursorGlowRadius;
        uniform vec3 uCursorGlowColor;
        uniform float uIsSafari;
        uniform float uIsMobile;
        uniform float uIsLowPower;
        
        varying vec2 vUv;
        
        const float PI = 3.14159265359;
        const float EPSILON = 0.001;
        const float MAX_DIST = 100.0;
        
        float smin(float a, float b, float k) {
          float h = max(k - abs(a - b), 0.0) / k;
          return min(a, b) - h * h * k * 0.25;
        }
        
        float sdSphere(vec3 p, float r) {
          return length(p) - r;
        }
        
        vec3 screenToWorld(vec2 normalizedPos) {
          vec2 uv = normalizedPos * 2.0 - 1.0;
          uv.x *= uResolution.x / uResolution.y;
          return vec3(uv * 2.0, 0.0);
        }
        
        float sceneSDF(vec3 pos) {
          float result = MAX_DIST;
          float t = uTime * uAnimationSpeed;
          
          // Fixed spheres - different positions for onboarding
          // Top left - smaller and positioned differently
          vec3 topLeftOffset = vec3(
            sin(t * 0.25) * 0.08,
            cos(t * 0.2) * 0.06,
            0.0
          );
          vec3 topLeftPos = screenToWorld(vec2(0.15, 0.90)) + topLeftOffset;
          float topLeft = sdSphere(pos - topLeftPos, uFixedTopLeftRadius);
          
          // Bottom right - smaller and positioned differently
          vec3 bottomRightOffset = vec3(
            sin(t * 0.22 + 2.0) * 0.08,
            cos(t * 0.18 + 2.0) * 0.06,
            0.0
          );
          vec3 bottomRightPos = screenToWorld(vec2(0.85, 0.12)) + bottomRightOffset;
          float bottomRight = sdSphere(pos - bottomRightPos, uFixedBottomRightRadius);
          
          // Top right - small sphere
          vec3 topRightBase = screenToWorld(vec2(0.90, 0.88));
          float topRightSpeed = 0.35;
          float topRightOrbitRadius = 0.15 * uMovementScale;
          vec3 topRightOffset = vec3(
            sin(t * topRightSpeed) * topRightOrbitRadius * 0.4,
            cos(t * topRightSpeed * 0.7) * topRightOrbitRadius * 0.3,
            sin(t * topRightSpeed * 0.3) * 0.15
          );
          vec3 topRightPos = topRightBase + topRightOffset;
          vec3 toCursorTopRight = uCursorSphere - topRightPos;
          float cursorDistTopRight = length(toCursorTopRight);
          if (cursorDistTopRight < uMergeDistance && cursorDistTopRight > 0.0) {
            float attraction = (1.0 - cursorDistTopRight / uMergeDistance) * 0.2;
            topRightPos += normalize(toCursorTopRight) * attraction;
          }
          float topRight = sdSphere(pos - topRightPos, uTopRightRadius);
          
          // Top right small
          vec3 topRightSmallBase = screenToWorld(vec2(0.88, 0.85));
          float topRightSmallSpeed = 0.38;
          float topRightSmallOrbitRadius = 0.12 * uMovementScale;
          vec3 topRightSmallOffset = vec3(
            sin(t * topRightSmallSpeed + 1.0) * topRightSmallOrbitRadius * 0.4,
            cos(t * topRightSmallSpeed * 0.65 + 1.0) * topRightSmallOrbitRadius * 0.3,
            sin(t * topRightSmallSpeed * 0.28 + 1.0) * 0.15
          );
          vec3 topRightSmallPos = topRightSmallBase + topRightSmallOffset;
          vec3 toCursorTopRightSmall = uCursorSphere - topRightSmallPos;
          float cursorDistTopRightSmall = length(toCursorTopRightSmall);
          if (cursorDistTopRightSmall < uMergeDistance && cursorDistTopRightSmall > 0.0) {
            float attraction = (1.0 - cursorDistTopRightSmall / uMergeDistance) * 0.2;
            topRightSmallPos += normalize(toCursorTopRightSmall) * attraction;
          }
          float topRightSmall = sdSphere(pos - topRightSmallPos, uTopRightSmallRadius);
          
          // Bottom left - small sphere
          vec3 bottomLeftBase = screenToWorld(vec2(0.10, 0.10));
          vec3 bottomLeftOffset = vec3(
            sin(t * 0.28 + 5.0) * 0.06,
            cos(t * 0.24 + 5.0) * 0.05,
            0.0
          );
          vec3 bottomLeftPos = bottomLeftBase + bottomLeftOffset;
          float bottomLeft = sdSphere(pos - bottomLeftPos, uBottomLeftRadius);
          
          // Moving spheres - positioned to avoid center/welcome text area
          // Place them more to the sides and avoid top center (where welcome text is)
          int maxIter = uIsMobile > 0.5 ? 2 : min(uSphereCount, 4);
          for (int i = 0; i < 4; i++) {
            if (i >= uSphereCount || i >= maxIter) break;
            
            float fi = float(i);
            float speed = 0.3 + fi * 0.1;
            float radius = uSphereRadius;
            float orbitRadius = 0.12 * uMovementScale;
            float phaseOffset = fi * PI * 0.4;
            
            // Position spheres to avoid center (where welcome text is)
            // Distribute them more to the sides
            float baseY = 0.5 + (mod(fi, 2.0) - 0.5) * 0.3; // Spread vertically, avoid top center
            float baseX = mod(fi, 2.0) < 1.0 ? 0.25 : 0.75; // Left and right sides
            
            vec3 offset = vec3(
              baseX + sin(t * speed + phaseOffset) * orbitRadius * 0.3,
              baseY + cos(t * speed * 0.8 + phaseOffset) * orbitRadius * 0.25,
              sin(t * speed * 0.3 + phaseOffset) * 0.12
            );
            
            vec3 toCursor = uCursorSphere - offset;
            float cursorDist = length(toCursor);
            if (cursorDist < uMergeDistance && cursorDist > 0.0) {
              float attraction = (1.0 - cursorDist / uMergeDistance) * 0.2;
              offset += normalize(toCursor) * attraction;
            }
            
            float movingSphere = sdSphere(pos - offset, radius);
            float blend = 0.05;
            if (cursorDist < uMergeDistance) {
              float influence = 1.0 - (cursorDist / uMergeDistance);
              blend = mix(0.05, uSmoothness, influence * influence * influence);
            }
            
            result = smin(result, movingSphere, blend);
          }
          
          float cursorBall = sdSphere(pos - uCursorSphere, uCursorRadius);
          
          result = smin(result, topLeft, 0.3);
          result = smin(result, bottomRight, 0.3);
          result = smin(result, topRight, 0.25);
          result = smin(result, topRightSmall, 0.25);
          result = smin(result, bottomLeft, 0.25);
          result = smin(result, cursorBall, uSmoothness);
          
          return result;
        }
        
        vec3 calcNormal(vec3 p) {
          float eps = uIsLowPower > 0.5 ? 0.002 : 0.001;
          return normalize(vec3(
            sceneSDF(p + vec3(eps, 0, 0)) - sceneSDF(p - vec3(eps, 0, 0)),
            sceneSDF(p + vec3(0, eps, 0)) - sceneSDF(p - vec3(0, eps, 0)),
            sceneSDF(p + vec3(0, 0, eps)) - sceneSDF(p - vec3(0, 0, eps))
          ));
        }
        
        float ambientOcclusion(vec3 p, vec3 n) {
          if (uIsLowPower > 0.5) {
            float h1 = sceneSDF(p + n * 0.03);
            float h2 = sceneSDF(p + n * 0.06);
            float occ = (0.03 - h1) + (0.06 - h2) * 0.5;
            return clamp(1.0 - occ * 2.0, 0.0, 1.0);
          } else {
            float occ = 0.0;
            float weight = 1.0;
            for (int i = 0; i < 6; i++) {
              float dist = 0.01 + 0.015 * float(i * i);
              float h = sceneSDF(p + n * dist);
              occ += (dist - h) * weight;
              weight *= 0.85;
            }
            return clamp(1.0 - occ, 0.0, 1.0);
          }
        }
        
        float softShadow(vec3 ro, vec3 rd, float mint, float maxt, float k) {
          if (uIsLowPower > 0.5) {
            float result = 1.0;
            float t = mint;
            for (int i = 0; i < 3; i++) {
              t += 0.3;
              if (t >= maxt) break;
              float h = sceneSDF(ro + rd * t);
              if (h < EPSILON) return 0.0;
              result = min(result, k * h / t);
            }
            return result;
          } else {
            float result = 1.0;
            float t = mint;
            for (int i = 0; i < 20; i++) {
              if (t >= maxt) break;
              float h = sceneSDF(ro + rd * t);
              if (h < EPSILON) return 0.0;
              result = min(result, k * h / t);
              t += h;
            }
            return result;
          }
        }
        
        vec3 getOrangeShadow(vec3 ro, vec3 rd, float mint, float maxt) {
          float shadowFactor = softShadow(ro, rd, mint, maxt, 20.0);
          vec3 orangeShadow = mix(
            vec3(1.0, 0.42, 0.21),
            vec3(1.0, 0.55, 0.26),
            shadowFactor
          );
          return mix(vec3(1.0), orangeShadow, 1.0 - shadowFactor);
        }
        
        float rayMarch(vec3 ro, vec3 rd) {
          float t = 0.0;
          int maxSteps = uIsMobile > 0.5 ? 16 : (uIsSafari > 0.5 ? 16 : 48);
          
          for (int i = 0; i < 48; i++) {
            if (i >= maxSteps) break;
            
            vec3 p = ro + rd * t;
            float d = sceneSDF(p);
            
            if (d < EPSILON) {
              return t;
            }
            
            if (t > 5.0) {
              break;
            }
            
            t += d * (uIsLowPower > 0.5 ? 1.2 : 0.9);
          }
          
          return -1.0;
        }
        
        vec3 lighting(vec3 p, vec3 rd, float t) {
          if (t < 0.0) {
            return vec3(0.0);
          }
          
          vec3 normal = calcNormal(p);
          vec3 viewDir = -rd;
          
          vec3 orange1 = vec3(1.0, 0.42, 0.21);
          vec3 orange2 = vec3(1.0, 0.55, 0.26);
          vec3 orange3 = vec3(1.0, 0.70, 0.35);
          vec3 orange4 = vec3(0.85, 0.30, 0.12);
          vec3 orange5 = vec3(1.0, 0.80, 0.45);
          
          float metallicPattern = sin(p.x * 3.0 + p.y * 3.0 + uTime * 0.8) * 0.5 + 0.5;
          float metallicPattern2 = cos(p.x * 2.5 - p.y * 2.5 + uTime * 0.6) * 0.5 + 0.5;
          float fresnelFactor = pow(1.0 - max(dot(viewDir, normal), 0.0), 1.5);
          
          vec3 baseColor = mix(
            mix(orange1, orange2, metallicPattern),
            mix(orange3, orange4, metallicPattern2),
            normal.y * 0.5 + 0.5 + fresnelFactor * 0.4
          );
          
          float metallicShine1 = pow(max(dot(normal, normalize(uLightPosition)), 0.0), 20.0);
          float metallicShine2 = pow(max(dot(normal, normalize(vec3(-1.0, 1.0, 0.5))), 0.0), 25.0);
          baseColor += orange5 * metallicShine1 * 0.35;
          baseColor += vec3(1.0, 0.7, 0.4) * metallicShine2 * 0.2;
          baseColor += orange3 * fresnelFactor * 0.3;
          
          float ao = ambientOcclusion(p, normal);
          vec3 ambient = uLightColor * uAmbientIntensity * ao;
          vec3 lightDir = normalize(uLightPosition);
          float diff = max(dot(normal, lightDir), 0.0);
          vec3 orangeShadow = getOrangeShadow(p, lightDir, 0.01, 10.0);
          float shadowFactor = (orangeShadow.r + orangeShadow.g + orangeShadow.b) / 3.0;
          vec3 diffuse = uLightColor * diff * uDiffuseIntensity * shadowFactor;
          vec3 reflectDir = reflect(-lightDir, normal);
          float spec = pow(max(dot(viewDir, reflectDir), 0.0), uSpecularPower);
          float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), uFresnelPower);
          vec3 specular = uLightColor * spec * uSpecularIntensity * fresnel;
          vec3 fresnelRim = uLightColor * fresnel * 0.4;
          
          float distToCursor = length(p - uCursorSphere);
          if (distToCursor < uCursorRadius + 0.4) {
            float highlight = 1.0 - smoothstep(0.0, uCursorRadius + 0.4, distToCursor);
            specular += uLightColor * highlight * 0.2;
            float glow = exp(-distToCursor * 3.0) * 0.15;
            ambient += uLightColor * glow * 0.5;
          }
          
          vec3 color = (baseColor + ambient + diffuse + specular + fresnelRim) * ao;
          color = pow(color, vec3(uContrast * 0.9));
          color = color / (color + vec3(0.8));
          
          return color;
        }
        
        float calculateCursorGlow(vec3 worldPos) {
          float dist = length(worldPos.xy - uCursorSphere.xy);
          float glow = 1.0 - smoothstep(0.0, uCursorGlowRadius, dist);
          glow = pow(glow, 1.5);
          return glow * uCursorGlowIntensity;
        }
        
        void main() {
          vec2 uv = (gl_FragCoord.xy * 2.0 - uActualResolution.xy) / uActualResolution.xy;
          uv.x *= uResolution.x / uResolution.y;
          
          vec3 ro = vec3(uv * 2.0, -1.0);
          vec3 rd = vec3(0.0, 0.0, 1.0);
          
          float t = rayMarch(ro, rd);
          vec3 p = ro + rd * t;
          vec3 color = lighting(p, rd, t);
          
          float cursorGlow = calculateCursorGlow(ro);
          vec3 glowContribution = uCursorGlowColor * cursorGlow;
          
          if (t > 0.0) {
            float fogAmount = 1.0 - exp(-t * uFogDensity);
            color = mix(color, uBackgroundColor.rgb, fogAmount * 0.2);
            color += glowContribution * 0.5;
            gl_FragColor = vec4(color, 1.0);
          } else {
            if (cursorGlow > 0.01) {
              gl_FragColor = vec4(glowContribution, cursorGlow * 0.6);
            } else {
              gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
            }
          }
        }
      `,
      transparent: true,
    })

    materialRef.current = material

    const geometry = new THREE.PlaneGeometry(2, 2)
    const mesh = new THREE.Mesh(geometry, material)
    scene.add(mesh)

    window.addEventListener('mousemove', onPointerMove, { passive: true })
    window.addEventListener('touchmove', onPointerMove, { passive: false })

    const clock = new THREE.Clock()

    function animate() {
      animationFrameRef.current = requestAnimationFrame(animate)

      mousePosition.x += (targetMousePosition.x - mousePosition.x) * settings.mouseSmoothness
      mousePosition.y += (targetMousePosition.y - mousePosition.y) * settings.mouseSmoothness

      if (material) {
        material.uniforms.uTime.value = clock.getElapsedTime()
        material.uniforms.uMousePosition.value = mousePosition

        const fixedPositions = [
          screenToWorldJS(0.15, 0.90),
          screenToWorldJS(0.85, 0.12),
        ]
        let closestDistance = 1000.0
        fixedPositions.forEach((pos) => {
          const dist = cursorSphere3D.distanceTo(pos)
          closestDistance = Math.min(closestDistance, dist)
        })

        const proximityFactor = Math.max(0, 1.0 - closestDistance / settings.mergeDistance)
        const smoothFactor = proximityFactor * proximityFactor * (3.0 - 2.0 * proximityFactor)
        const dynamicRadius =
          settings.cursorRadiusMin +
          (settings.cursorRadiusMax - settings.cursorRadiusMin) * smoothFactor

        material.uniforms.uCursorRadius.value = dynamicRadius
      }

      renderer.render(scene, camera)
    }

    animate()

    function onWindowResize() {
      const width = window.innerWidth
      const height = window.innerHeight
      const currentPixelRatio = Math.min(devicePixelRatio, isMobile ? 1.5 : 2)

      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
      renderer.setPixelRatio(currentPixelRatio)

      if (material) {
        material.uniforms.uResolution.value.set(width, height)
        material.uniforms.uActualResolution.value.set(
          width * currentPixelRatio,
          height * currentPixelRatio
        )
        material.uniforms.uPixelRatio.value = currentPixelRatio
      }
    }

    window.addEventListener('resize', onWindowResize, { passive: true })

    // Update opacity based on hideInWelcome prop
    const updateOpacity = () => {
      if (canvas) {
        canvas.style.opacity = hideInWelcome ? '0' : '1'
      }
    }
    updateOpacity()

    // Save ref value for cleanup
    const containerElement = containerRef.current

    return () => {
      window.removeEventListener('mousemove', onPointerMove)
      window.removeEventListener('touchmove', onPointerMove)
      window.removeEventListener('resize', onWindowResize)

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }

      if (renderer) {
        renderer.dispose()
        if (containerElement && canvas.parentNode) {
          canvas.parentNode.removeChild(canvas)
        }
      }

      if (material) {
        material.dispose()
      }
    }
  }, [hideInWelcome])

  return <div ref={containerRef} className="fixed inset-0 w-full h-full" />
}

