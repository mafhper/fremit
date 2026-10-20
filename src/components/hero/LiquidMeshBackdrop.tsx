/**
 * LiquidMeshBackdrop.tsx
 * Fundo WebGL (LiquidMesh) da home. A troca de tema ou de clima (`mood`) interpola os
 * parâmetros em vez de recriar o programa; o handle `capture` devolve um recorte do
 * quadro atual para compor a exportação da prancheta.
 */

import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';
import { DEBUG_FRAGMENT_SHADER, FRAGMENT_SHADER, VERTEX_SHADER } from './shader';
import { createFullScreenTriangle, createProgram, getWebGLContext } from './webgl';
import { isSettled, lerpShaderState, smoothingFactor, toShaderState } from './liquidState';
import { liquidMoods, type LiquidMood } from './presets';
import { useThemePreset, type LiquidVariant } from './useThemePreset';
import { cn } from '@/lib/utils';

type WebglStatus =
  | 'idle'
  | 'reduced-motion'
  | 'context-failed'
  | 'shader-failed'
  | 'rendering'
  | 'paused'
  | 'context-lost'
  | 'context-restored'
  | 'render-error';

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function readDebugParams(): { debug: boolean; testShader: boolean } {
  if (typeof window === 'undefined') {
    return { debug: false, testShader: false };
  }
  const params = new URLSearchParams(window.location.search);
  return {
    debug: params.has('webglDebug'),
    testShader: params.has('webglTestShader'),
  };
}

export interface LiquidMeshHandle {
  /**
   * Renderiza o quadro atual e copia a região `rect` (coordenadas da viewport) para um canvas 2D.
   * Retorna null quando o WebGL não está ativo (reduced motion, contexto perdido ou falha de shader).
   */
  capture: (rect: DOMRect) => HTMLCanvasElement | null;
}

interface LiquidMeshBackdropProps {
  interactive?: boolean;
  variant?: LiquidVariant;
  /** Quando informado, sobrepõe o preset derivado do tema. */
  mood?: LiquidMood;
  className?: string;
  ref?: Ref<LiquidMeshHandle>;
}

export function LiquidMeshBackdrop({
  interactive = true,
  variant = 'home',
  mood,
  className,
  ref,
}: LiquidMeshBackdropProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const themePreset = useThemePreset(variant);
  const preset = mood ? liquidMoods[mood] : themePreset;
  const presetRef = useRef(preset);
  const captureRef = useRef<LiquidMeshHandle['capture'] | null>(null);
  const [status, setStatus] = useState<WebglStatus>('idle');
  const statusRef = useRef<WebglStatus>('idle');
  const [debugParams] = useState(() => readDebugParams());

  useEffect(() => {
    presetRef.current = preset;
  }, [preset]);

  useImperativeHandle(ref, () => ({ capture: (rect) => captureRef.current?.(rect) ?? null }), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const el: HTMLCanvasElement = canvas;

    const { debug, testShader } = debugParams;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let disposed = false;
    let rafId = 0;
    let shouldRender = true;
    let targetMouseX = 0.5;
    let targetMouseY = 0.5;
    let currentMouseX = 0.5;
    let currentMouseY = 0.5;

    let gl: WebGLRenderingContext | null = null;
    let program: WebGLProgram | null = null;
    let buffer: WebGLBuffer | null = null;
    let uniforms: Record<string, WebGLUniformLocation | null> = {};
    let posLoc = -1;

    // Estado interpolado do shader: `current` persegue `target` (preset ativo).
    let targetPreset = presetRef.current;
    let target = toShaderState(targetPreset);
    let current = target;
    let shaderTime = 0;
    let lastFrameAt = performance.now();

    function updateStatus(next: WebglStatus) {
      if (statusRef.current === next) return;
      statusRef.current = next;
      setStatus(next);
    }

    function setCanvasVisible(visible: boolean) {
      el.style.opacity = visible ? '1' : '0';
    }

    function stopLoop() {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
    }

    function startLoop() {
      if (disposed || rafId || !shouldRender) return;
      rafId = requestAnimationFrame(render);
    }

    function cleanupGlResources() {
      if (!gl || gl.isContextLost()) return;
      if (buffer) { gl.deleteBuffer(buffer); buffer = null; }
      if (program) { gl.deleteProgram(program); program = null; }
    }

    // ─── Context loss ──────────────────────────────────────────────────
    const onContextLost = (e: Event) => {
      e.preventDefault();
      shouldRender = false;
      stopLoop();
      setCanvasVisible(false);
      updateStatus('context-lost');
      if (debug) console.warn('[LiquidMesh] WebGL context lost');
    };

    const onContextRestored = () => {
      setCanvasVisible(false);
      updateStatus('context-restored');
      if (debug) console.warn('[LiquidMesh] WebGL context restored; fallback active until remount');
    };

    el.addEventListener('webglcontextlost', onContextLost, false);
    el.addEventListener('webglcontextrestored', onContextRestored, false);

    // ─── Reduced motion ───────────────────────────────────────────────
    if (reducedMotion) {
      setCanvasVisible(false);
      updateStatus('reduced-motion');
      if (debug) console.info('[LiquidMesh] disabled by prefers-reduced-motion');
      return () => {
        el.removeEventListener('webglcontextlost', onContextLost, false);
        el.removeEventListener('webglcontextrestored', onContextRestored, false);
      };
    }

    setCanvasVisible(true);

    // ─── WebGL context ────────────────────────────────────────────────
    gl = getWebGLContext(el);
    if (!gl || gl.isContextLost()) {
      setCanvasVisible(false);
      updateStatus('context-failed');
      if (debug) console.error('[LiquidMesh] WebGL context unavailable or already lost');
      return () => {
        el.removeEventListener('webglcontextlost', onContextLost, false);
        el.removeEventListener('webglcontextrestored', onContextRestored, false);
      };
    }

    if (debug) {
      console.info('[LiquidMesh] WebGL context created', {
        renderer: gl.getParameter(gl.RENDERER),
        vendor: gl.getParameter(gl.VENDOR),
        version: gl.getParameter(gl.VERSION),
      });
    }

    // ─── Shaders ──────────────────────────────────────────────────────
    try {
      const shader = testShader ? DEBUG_FRAGMENT_SHADER : FRAGMENT_SHADER;
      const result = createProgram(gl, VERTEX_SHADER, shader);
      program = result.program;
      uniforms = result.uniforms;
    } catch (error) {
      console.error('[LiquidMesh] Shader error:', error);
      cleanupGlResources();
      setCanvasVisible(false);
      updateStatus('shader-failed');
      return () => {
        el.removeEventListener('webglcontextlost', onContextLost, false);
        el.removeEventListener('webglcontextrestored', onContextRestored, false);
      };
    }

    // ─── Geometry ─────────────────────────────────────────────────────
    buffer = createFullScreenTriangle(gl);
    posLoc = gl.getAttribLocation(program, 'aPosition');
    if (posLoc < 0) {
      console.error('[LiquidMesh] Missing aPosition attribute');
      cleanupGlResources();
      setCanvasVisible(false);
      updateStatus('shader-failed');
      return () => {
        el.removeEventListener('webglcontextlost', onContextLost, false);
        el.removeEventListener('webglcontextrestored', onContextRestored, false);
      };
    }

    // ─── Resize ───────────────────────────────────────────────────────
    function syncSize() {
      if (!gl) return;
      const rect = el.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.max(1, Math.floor(rect.width * dpr));
      const h = Math.max(1, Math.floor(rect.height * dpr));
      if (el.width !== w || el.height !== h) {
        el.width = w;
        el.height = h;
        gl.viewport(0, 0, w, h);
        if (debug) console.info('[LiquidMesh] resized', { w, h, dpr });
      }
    }

    // ─── Interaction ─────────────────────────────────────────────────
    const onPointerMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      targetMouseX = clamp01((e.clientX - rect.left) / rect.width);
      targetMouseY = clamp01((e.clientY - rect.top) / rect.height);
    };

    if (interactive) {
      window.addEventListener('pointermove', onPointerMove, { passive: true });
    }

    const onVisibilityChange = () => {
      shouldRender = document.visibilityState === 'visible';
      if (shouldRender) { updateStatus('rendering'); startLoop(); }
      else { updateStatus('paused'); stopLoop(); }
    };

    const resizeObserver = new ResizeObserver(() => { syncSize(); startLoop(); });
    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        shouldRender = entry.isIntersecting && document.visibilityState === 'visible';
        if (shouldRender) { updateStatus('rendering'); startLoop(); }
        else { updateStatus('paused'); stopLoop(); }
      },
      { threshold: 0.01 },
    );

    document.addEventListener('visibilitychange', onVisibilityChange);
    resizeObserver.observe(el);
    intersectionObserver.observe(el);

    syncSize();

    // ─── Draw (uniforms + draw call, sem avançar o estado) ────────────
    function drawFrame() {
      if (!gl || !program || !buffer) return;
      const s = current.scalars;
      const { a, b, c } = current.colors;

      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

      gl.uniform1f(uniforms.uTime,       shaderTime);
      gl.uniform2f(uniforms.uResolution, el.width, el.height);
      gl.uniform2f(uniforms.uMouse,      currentMouseX, currentMouseY);
      gl.uniform1f(uniforms.uWarp,       s.warp);
      gl.uniform1f(uniforms.uRipple,     s.ripple);
      gl.uniform1f(uniforms.uChrome,     s.chrome);
      gl.uniform1f(uniforms.uContrast,   s.contrast);
      gl.uniform1f(uniforms.uGrain,      s.grain);
      gl.uniform1f(uniforms.uPointer,    interactive ? s.pointer : 0);
      gl.uniform1f(uniforms.uClouds,     s.clouds);
      gl.uniform1f(uniforms.uStars,      s.stars);
      gl.uniform1f(uniforms.uBloom,      s.bloom);
      gl.uniform2f(uniforms.uCenter,     s.centerX, s.centerY);
      gl.uniform1f(uniforms.uCenterSize, s.centerSize);
      gl.uniform3f(uniforms.uColorA,     a[0], a[1], a[2]);
      gl.uniform3f(uniforms.uColorB,     b[0], b[1], b[2]);
      gl.uniform3f(uniforms.uColorC,     c[0], c[1], c[2]);

      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    // ─── Render loop ──────────────────────────────────────────────────
    function render() {
      rafId = 0;

      if (disposed || !shouldRender) return;
      if (!gl || !program || !buffer || gl.isContextLost()) return;
      if (el.width === 0 || el.height === 0) { startLoop(); return; }

      try {
        const now = performance.now();
        const dt = Math.min((now - lastFrameAt) / 1000, 0.1);
        lastFrameAt = now;

        if (presetRef.current !== targetPreset) {
          targetPreset = presetRef.current;
          target = toShaderState(targetPreset);
        }
        current = isSettled(current, target)
          ? target
          : lerpShaderState(current, target, smoothingFactor(dt));

        shaderTime += dt * current.scalars.speed;

        // Mouse Inertia (Lerp)
        currentMouseX += (targetMouseX - currentMouseX) * 0.05;
        currentMouseY += (targetMouseY - currentMouseY) * 0.05;

        drawFrame();

        if (debug) {
          const err = gl.getError();
          if (err !== gl.NO_ERROR) console.warn('[LiquidMesh] gl.getError:', err);
        }

        updateStatus('rendering');
        startLoop();
      } catch (error) {
        console.error('[LiquidMesh] render error:', error);
        stopLoop();
        setCanvasVisible(false);
        updateStatus('render-error');
      }
    }

    // ─── Capture (exportação da prancheta) ────────────────────────────
    // O buffer WebGL só é legível na mesma tarefa em que foi desenhado
    // (preserveDrawingBuffer = false), por isso desenhamos e copiamos juntos.
    captureRef.current = (rect) => {
      if (!gl || !program || !buffer || gl.isContextLost()) return null;
      if (el.width === 0 || el.height === 0) return null;

      drawFrame();

      const view = el.getBoundingClientRect();
      if (view.width <= 0 || view.height <= 0) return null;
      const sx = el.width / view.width;
      const sy = el.height / view.height;

      const out = document.createElement('canvas');
      out.width = Math.max(1, Math.round(rect.width * sx));
      out.height = Math.max(1, Math.round(rect.height * sy));
      const ctx = out.getContext('2d');
      if (!ctx) return null;

      ctx.drawImage(
        el,
        (rect.left - view.left) * sx,
        (rect.top - view.top) * sy,
        rect.width * sx,
        rect.height * sy,
        0,
        0,
        out.width,
        out.height,
      );
      return out;
    };

    updateStatus('rendering');
    startLoop();

    // ─── Cleanup ──────────────────────────────────────────────────────
    return () => {
      disposed = true;
      captureRef.current = null;
      stopLoop();
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      if (interactive) {
        window.removeEventListener('pointermove', onPointerMove);
      }
      document.removeEventListener('visibilitychange', onVisibilityChange);
      el.removeEventListener('webglcontextlost', onContextLost, false);
      el.removeEventListener('webglcontextrestored', onContextRestored, false);
      cleanupGlResources();
    };
  }, [interactive, debugParams]);

  return (
    <>
      <div className="hero__fallback" aria-hidden="true" />
      <canvas
        ref={canvasRef}
        className={cn('hero__canvas', className)}
        data-webgl-status={status}
        aria-hidden="true"
      />
      {debugParams.debug ? (
        <output className="hero__webgl-debug" aria-live="off">
          WebGL: {status}
        </output>
      ) : null}
    </>
  );
}
