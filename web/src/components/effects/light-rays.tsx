"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import type { Mesh as OglMesh, Renderer as OglRenderer } from "ogl";

import { cn } from "@/lib/utils";

export type RaysOrigin =
  | "top-center"
  | "top-left"
  | "top-right"
  | "right"
  | "left"
  | "bottom-center"
  | "bottom-right"
  | "bottom-left";

export type LightRaysProps = {
  raysOrigin?: RaysOrigin;
  raysColor?: string;
  raysSpeed?: number;
  lightSpread?: number;
  rayLength?: number;
  pulsating?: boolean;
  fadeDistance?: number;
  saturation?: number;
  followMouse?: boolean;
  mouseInfluence?: number;
  noiseAmount?: number;
  distortion?: number;
  onRenderModeChange?: (mode: LightRaysRenderMode) => void;
  showFallback?: boolean;
  className?: string;
  style?: CSSProperties;
};

export type LightRaysRenderMode =
  | "initializing"
  | "webgl"
  | "fallback"
  | "reduced-motion";

type Vec2 = [number, number];
type Vec3 = [number, number, number];

type Uniforms = {
  iTime: { value: number };
  iResolution: { value: Vec2 };
  rayPos: { value: Vec2 };
  rayDir: { value: Vec2 };
  raysColor: { value: Vec3 };
  raysSpeed: { value: number };
  lightSpread: { value: number };
  rayLength: { value: number };
  pulsating: { value: number };
  fadeDistance: { value: number };
  saturation: { value: number };
  mousePos: { value: Vec2 };
  mouseInfluence: { value: number };
  noiseAmount: { value: number };
  distortion: { value: number };
};

const DEFAULT_COLOR = "#ffffff";
const MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const MAX_DEVICE_PIXEL_RATIO = 2;

const vertexShader = `
attribute vec2 position;
varying vec2 vUv;

void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}`;

const fragmentShader = `precision highp float;

uniform float iTime;
uniform vec2 iResolution;
uniform vec2 rayPos;
uniform vec2 rayDir;
uniform vec3 raysColor;
uniform float raysSpeed;
uniform float lightSpread;
uniform float rayLength;
uniform float pulsating;
uniform float fadeDistance;
uniform float saturation;
uniform vec2 mousePos;
uniform float mouseInfluence;
uniform float noiseAmount;
uniform float distortion;

varying vec2 vUv;

float noise(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

float rayStrength(
  vec2 raySource,
  vec2 rayRefDirection,
  vec2 coord,
  float seedA,
  float seedB,
  float speed
) {
  vec2 sourceToCoord = coord - raySource;
  vec2 dirNorm = normalize(sourceToCoord);
  float cosAngle = dot(dirNorm, rayRefDirection);
  float distortedAngle =
    cosAngle + distortion * sin(iTime * 2.0 + length(sourceToCoord) * 0.01) * 0.2;
  float spreadFactor = pow(
    max(distortedAngle, 0.0),
    1.0 / max(lightSpread, 0.001)
  );
  float distance = length(sourceToCoord);
  float maxDistance = iResolution.x * rayLength;
  float lengthFalloff = clamp((maxDistance - distance) / maxDistance, 0.0, 1.0);
  float fadeFalloff = clamp(
    (iResolution.x * fadeDistance - distance) / (iResolution.x * fadeDistance),
    0.5,
    1.0
  );
  float pulse =
    pulsating > 0.5 ? (0.8 + 0.2 * sin(iTime * speed * 3.0)) : 1.0;
  float baseStrength = clamp(
    (0.45 + 0.15 * sin(distortedAngle * seedA + iTime * speed)) +
      (0.3 + 0.2 * cos(-distortedAngle * seedB + iTime * speed)),
    0.0,
    1.0
  );

  return baseStrength * lengthFalloff * fadeFalloff * spreadFactor * pulse;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 coord = vec2(fragCoord.x, iResolution.y - fragCoord.y);
  vec2 finalRayDir = rayDir;

  if (mouseInfluence > 0.0) {
    vec2 mouseScreenPos = mousePos * iResolution.xy;
    vec2 mouseDirection = normalize(mouseScreenPos - rayPos);
    finalRayDir = normalize(mix(rayDir, mouseDirection, mouseInfluence));
  }

  vec4 rays1 = vec4(1.0) *
    rayStrength(rayPos, finalRayDir, coord, 36.2214, 21.11349, 1.5 * raysSpeed);
  vec4 rays2 = vec4(1.0) *
    rayStrength(rayPos, finalRayDir, coord, 22.3991, 18.0234, 1.1 * raysSpeed);

  fragColor = rays1 * 0.5 + rays2 * 0.4;

  if (noiseAmount > 0.0) {
    float n = noise(coord * 0.01 + iTime * 0.1);
    fragColor.rgb *= (1.0 - noiseAmount + noiseAmount * n);
  }

  float brightness = 1.0 - (coord.y / iResolution.y);
  fragColor.x *= 0.1 + brightness * 0.8;
  fragColor.y *= 0.3 + brightness * 0.6;
  fragColor.z *= 0.5 + brightness * 0.5;

  if (saturation != 1.0) {
    float gray = dot(fragColor.rgb, vec3(0.299, 0.587, 0.114));
    fragColor.rgb = mix(vec3(gray), fragColor.rgb, saturation);
  }

  fragColor.rgb *= raysColor;
}

void main() {
  vec4 color;
  mainImage(color, gl_FragCoord.xy);
  gl_FragColor = color;
}`;

export function LightRays({
  raysOrigin = "top-center",
  raysColor = DEFAULT_COLOR,
  raysSpeed = 0.25,
  lightSpread = 0.8,
  rayLength = 1.8,
  pulsating = false,
  fadeDistance = 1,
  saturation = 0.75,
  followMouse = false,
  mouseInfluence = 0,
  noiseAmount = 0.01,
  distortion = 0.02,
  onRenderModeChange,
  showFallback = true,
  className,
  style,
}: LightRaysProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const uniformsRef = useRef<Uniforms | null>(null);
  const rendererRef = useRef<OglRenderer | null>(null);
  const meshRef = useRef<OglMesh | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const raysColorRef = useRef(raysColor);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  const smoothMouseRef = useRef({ x: 0.5, y: 0.5 });
  const renderModeRef = useRef<LightRaysRenderMode>("initializing");
  const [renderMode, setRenderMode] =
    useState<LightRaysRenderMode>("initializing");
  const [isVisible, setIsVisible] = useState(
    () => typeof IntersectionObserver === "undefined",
  );
  const prefersReducedMotion = usePrefersReducedMotion();
  const updateRenderMode = useCallback((mode: LightRaysRenderMode) => {
    if (renderModeRef.current === mode) return;

    renderModeRef.current = mode;
    setRenderMode(mode);
  }, []);

  const fallbackStyle = useMemo<CSSProperties>(
    () =>
      raysOrigin === "top-center"
        ? {
            background: [
              `conic-gradient(from 150deg at 50% -10%, transparent 0deg, ${rgbaFromHex(
                raysColor,
                0.12,
              )} 9deg, transparent 20deg, ${rgbaFromHex(
                raysColor,
                0.18,
              )} 31deg, transparent 44deg, ${rgbaFromHex(
                raysColor,
                0.1,
              )} 56deg, transparent 70deg)`,
              `radial-gradient(ellipse at 50% 0%, ${rgbaFromHex(
                raysColor,
                0.12,
              )} 0%, transparent 68%)`,
            ].join(", "),
          }
        : {
            background: [
              `linear-gradient(110deg, transparent 0%, ${rgbaFromHex(
                raysColor,
                0.18,
              )} 38%, transparent 76%)`,
              `linear-gradient(180deg, ${rgbaFromHex(
                raysColor,
                0.12,
              )} 0%, transparent 68%)`,
            ].join(", "),
          },
    [raysColor, raysOrigin],
  );

  useEffect(() => {
    onRenderModeChange?.(renderMode);
  }, [onRenderModeChange, renderMode]);

  useEffect(() => {
    raysColorRef.current = raysColor;

    const uniforms = uniformsRef.current;

    if (uniforms) {
      uniforms.raysColor.value = hexToRgb(raysColor);
    }
  }, [raysColor]);

  useEffect(() => {
    const root = rootRef.current;

    if (!root) {
      return;
    }

    if (typeof IntersectionObserver === "undefined") {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        setIsVisible(entries[0]?.isIntersecting ?? false);
      },
      { threshold: 0.01 },
    );

    observer.observe(root);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const host = canvasHostRef.current;

    if (!host) {
      return;
    }

    if (prefersReducedMotion === null) {
      updateRenderMode("initializing");
      return;
    }

    if (prefersReducedMotion) {
      cleanupRef.current?.();
      cleanupRef.current = null;
      updateRenderMode("reduced-motion");
      return;
    }

    if (!isVisible) {
      cleanupRef.current?.();
      cleanupRef.current = null;
      updateRenderMode("fallback");
      return;
    }

    const canvasHost = host;

    cleanupRef.current?.();
    cleanupRef.current = null;
    updateRenderMode("initializing");

    let disposed = false;
    let initializedRenderer: OglRenderer | null = null;

    async function initializeWebGL() {
      try {
        await new Promise((resolve) => window.setTimeout(resolve, 10));

        if (disposed || !canvasHost.isConnected) {
          return;
        }

        const { Mesh, Program, Renderer, Triangle } = await import("ogl");

        if (disposed || !canvasHost.isConnected) {
          return;
        }

        const renderer = new Renderer({
          alpha: true,
          dpr: getDevicePixelRatio(),
        });
        initializedRenderer = renderer;
        const gl = renderer.gl;

        rendererRef.current = renderer;
        gl.canvas.style.display = "block";
        gl.canvas.style.height = "100%";
        gl.canvas.style.width = "100%";
        gl.canvas.setAttribute("aria-hidden", "true");
        gl.canvas.tabIndex = -1;
        canvasHost.replaceChildren(gl.canvas);

        const uniforms: Uniforms = {
        iResolution: { value: [1, 1] },
        iTime: { value: 0 },
        fadeDistance: { value: fadeDistance },
        lightSpread: { value: lightSpread },
        mouseInfluence: { value: mouseInfluence },
        mousePos: { value: [0.5, 0.5] },
        noiseAmount: { value: noiseAmount },
        pulsating: { value: pulsating ? 1 : 0 },
        rayDir: { value: [0, 1] },
        rayLength: { value: rayLength },
        rayPos: { value: [0, 0] },
        raysColor: { value: hexToRgb(raysColorRef.current) },
        raysSpeed: { value: raysSpeed },
        saturation: { value: saturation },
        distortion: { value: distortion },
        };
        const geometry = new Triangle(gl);
        const program = new Program(gl, {
          fragment: fragmentShader,
          uniforms,
          vertex: vertexShader,
        });
        const mesh = new Mesh(gl, { geometry, program });

        uniformsRef.current = uniforms;
        meshRef.current = mesh;

        const updatePlacement = () => {
        const width = canvasHost.clientWidth;
        const height = canvasHost.clientHeight;

        if (disposed || width <= 0 || height <= 0) {
          return;
        }

        renderer.dpr = getDevicePixelRatio();
        renderer.setSize(width, height);

        const renderWidth = width * renderer.dpr;
        const renderHeight = height * renderer.dpr;
        const { anchor, dir } = getAnchorAndDir(
          raysOrigin,
          renderWidth,
          renderHeight,
        );

        uniforms.iResolution.value = [renderWidth, renderHeight];
        uniforms.rayPos.value = anchor;
        uniforms.rayDir.value = dir;
        };
        const resizeObserver =
          typeof ResizeObserver === "undefined"
            ? null
            : new ResizeObserver(updatePlacement);
        const canFollowMouse = followMouse && mouseInfluence > 0;
        const handleMouseMove = (event: MouseEvent) => {
        const rect = canvasHost.getBoundingClientRect();

        if (rect.width <= 0 || rect.height <= 0) {
          return;
        }

        mouseRef.current = {
          x: (event.clientX - rect.left) / rect.width,
          y: (event.clientY - rect.top) / rect.height,
        };
        };
        const handleContextLost = (event: Event) => {
          event.preventDefault();
          updateRenderMode("fallback");
          cleanupRef.current?.();
          cleanupRef.current = null;
        };
        let renderedFirstFrame = false;
        const loop = (time: number) => {
        if (disposed || !rendererRef.current || !meshRef.current) {
          return;
        }

        uniforms.iTime.value = time * 0.001;

        if (canFollowMouse) {
          const smoothing = 0.92;

          smoothMouseRef.current.x =
            smoothMouseRef.current.x * smoothing +
            mouseRef.current.x * (1 - smoothing);
          smoothMouseRef.current.y =
            smoothMouseRef.current.y * smoothing +
            mouseRef.current.y * (1 - smoothing);
          uniforms.mousePos.value = [
            smoothMouseRef.current.x,
            smoothMouseRef.current.y,
          ];
        }

          try {
            renderer.render({ scene: mesh });
          } catch {
            updateRenderMode("fallback");
            cleanupRef.current?.();
            cleanupRef.current = null;
            return;
          }

          if (!renderedFirstFrame) {
            renderedFirstFrame = true;
            updateRenderMode("webgl");
          }

          animationIdRef.current = requestAnimationFrame(loop);
        };

        resizeObserver?.observe(canvasHost);

        if (!resizeObserver) {
          window.addEventListener("resize", updatePlacement);
        }

        if (canFollowMouse) {
          window.addEventListener("mousemove", handleMouseMove, {
            passive: true,
          });
        }

        gl.canvas.addEventListener("webglcontextlost", handleContextLost);

        updatePlacement();

        cleanupRef.current = () => {
          disposed = true;

          if (animationIdRef.current !== null) {
            cancelAnimationFrame(animationIdRef.current);
            animationIdRef.current = null;
          }

          resizeObserver?.disconnect();

          if (!resizeObserver) {
            window.removeEventListener("resize", updatePlacement);
          }

          if (canFollowMouse) {
            window.removeEventListener("mousemove", handleMouseMove);
          }

          const canvas = renderer.gl.canvas;
          canvas.removeEventListener("webglcontextlost", handleContextLost);

          if (!renderer.gl.isContextLost()) {
            const loseContext = renderer.gl.getExtension("WEBGL_lose_context");
            loseContext?.loseContext();
          }

          canvas.remove();
          rendererRef.current = null;
          uniformsRef.current = null;
          meshRef.current = null;
        };

        animationIdRef.current = requestAnimationFrame(loop);
      } catch {
        if (!disposed) {
          if (initializedRenderer) {
            const failedRenderer = initializedRenderer;

            if (!failedRenderer.gl.isContextLost()) {
              const loseContext =
                failedRenderer.gl.getExtension("WEBGL_lose_context");
              loseContext?.loseContext();
            }

            failedRenderer.gl.canvas.remove();
          }

          canvasHost.replaceChildren();
          rendererRef.current = null;
          uniformsRef.current = null;
          meshRef.current = null;
          updateRenderMode("fallback");
        }
      }
    }

    void initializeWebGL();

    return () => {
      disposed = true;
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, [
    distortion,
    fadeDistance,
    followMouse,
    isVisible,
    lightSpread,
    mouseInfluence,
    noiseAmount,
    prefersReducedMotion,
    pulsating,
    rayLength,
    raysOrigin,
    raysSpeed,
    saturation,
    updateRenderMode,
  ]);

  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none relative h-full w-full overflow-hidden",
        className,
      )}
      data-light-rays-render-mode={renderMode}
      ref={rootRef}
      style={style}
    >
      {showFallback ? (
        <div
          className="absolute inset-0 opacity-70"
          data-light-rays-fallback="true"
          style={fallbackStyle}
        />
      ) : null}
      <div
        className="absolute inset-0"
        data-light-rays-canvas-host="true"
        ref={canvasHostRef}
      />
    </div>
  );
}

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<
    boolean | null
  >(() => {
    if (typeof window === "undefined") {
      return null;
    }

    if (typeof window.matchMedia !== "function") {
      return false;
    }

    return window.matchMedia(MOTION_QUERY).matches;
  });

  useEffect(() => {
    if (typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia(MOTION_QUERY);
    const updatePreference = () =>
      setPrefersReducedMotion(mediaQuery.matches);

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", updatePreference);
    } else {
      mediaQuery.addListener(updatePreference);
    }

    return () => {
      if (typeof mediaQuery.removeEventListener === "function") {
        mediaQuery.removeEventListener("change", updatePreference);
      } else {
        mediaQuery.removeListener(updatePreference);
      }
    };
  }, []);

  return prefersReducedMotion;
}

function getDevicePixelRatio() {
  return Math.min(window.devicePixelRatio || 1, MAX_DEVICE_PIXEL_RATIO);
}

function getAnchorAndDir(
  origin: RaysOrigin,
  width: number,
  height: number,
): { anchor: Vec2; dir: Vec2 } {
  const outside = 0.08;

  switch (origin) {
    case "top-left":
      return { anchor: [0, -outside * height], dir: [0, 1] };
    case "top-right":
      return { anchor: [width, -outside * height], dir: [0, 1] };
    case "left":
      return { anchor: [-outside * width, 0.5 * height], dir: [1, 0] };
    case "right":
      return { anchor: [(1 + outside) * width, 0.5 * height], dir: [-1, 0] };
    case "bottom-left":
      return { anchor: [0, (1 + outside) * height], dir: [0, -1] };
    case "bottom-center":
      return { anchor: [0.5 * width, (1 + outside) * height], dir: [0, -1] };
    case "bottom-right":
      return { anchor: [width, (1 + outside) * height], dir: [0, -1] };
    case "top-center":
      return { anchor: [0.5 * width, -outside * height], dir: [0, 1] };
  }
}

function hexToRgb(hex: string): Vec3 {
  const { b, g, r } = parseHexColor(hex);

  return [r / 255, g / 255, b / 255];
}

function rgbaFromHex(hex: string, alpha: number) {
  const { b, g, r } = parseHexColor(hex);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function parseHexColor(hex: string) {
  const clean = hex.replace("#", "").trim();
  const normalized =
    clean.length === 3
      ? clean
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : clean.padEnd(6, "f").slice(0, 6);
  const value = Number.parseInt(normalized, 16);

  if (Number.isNaN(value)) {
    return { b: 255, g: 255, r: 255 };
  }

  return {
    b: value & 255,
    g: (value >> 8) & 255,
    r: (value >> 16) & 255,
  };
}
