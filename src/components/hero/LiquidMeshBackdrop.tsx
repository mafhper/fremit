/**
 * LiquidMeshBackdrop.tsx
 * Canvas WebGL decorativo para o hero.
 *
 * O effect principal depende de `preset` + `interactive`.
 * Quando o tema muda, o effect faz cleanup e setup novamente —
 * seguro porque o cleanup NÃO usa WEBGL_lose_context.
 *
 * Props:
 * - interactive (default true): quando false, desativa pointer tracking
 *   e envia uPointer = 0 ao shader.
 *
 * Features:
 * - startLoop/stopLoop para pausar RAF fora da viewport
 * - data-webgl-status para diagnóstico
 * - ?webglDebug=1 e ?webglTestShader=1
 * - prefers-reduced-motion
 * - webglcontextlost / webglcontextrestored
 */

import { useEffect, useRef, useState } from 'react';
import { DEBUG_FRAGMENT_SHADER, FRAGMENT_SHADER, VERTEX_SHADER } from './shader';
import {
  createFullScreenTriangle,
  createProgram,
  getWebGLContext,
  hexToRgb,
} from './webgl';
import { useThemePreset } from './useThemePreset';

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

interface LiquidMeshBackdropProps {
  interactive?: boolean;
}

export function LiquidMeshBackdrop({ interactive = true }: LiquidMeshBackdropProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const preset = useThemePreset();
  const [status, setStatus] = useState<WebglStatus>('idle');
  const statusRef = useRef<WebglStatus>('idle');
  const debugParamsRef = useRef(readDebugParams());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const el: HTMLCanvasElement = canvas;

    const { debug, testShader } = debugParamsRef.current;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let disposed = false;
    let rafId = 0;
    let shouldRender = true;
    let mouseX = 0.5;
    let mouseY = 0.5;

    let gl: WebGLRenderingContext | null = null;
    let program: WebGLProgram | null = null;
    let buffer: WebGLBuffer | null = null;
    let uniforms: Record<string, WebGLUniformLocation | null> = {};
    let posLoc = -1;

    function updateStatus(next: WebglStatus) {
      if (statusRef.current === next) return;
      statusRef.current = next;
      setStatus(next);
    }

    function setCanvasVisible(visible: boolean) {
      el.style.display = visible ? '' : 'none';
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
      mouseX = clamp01((e.clientX - rect.left) / rect.width);
      mouseY = clamp01((e.clientY - rect.top) / rect.height);
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

    const startedAt = performance.now();

    // ─── Render loop ──────────────────────────────────────────────────
    // Usa `preset` diretamente (capturado por closure do effect).
    // O effect reexecuta quando preset muda, garantindo cores corretas.
    function render() {
      rafId = 0;

      if (disposed || !shouldRender) return;
      if (!gl || !program || !buffer || gl.isContextLost()) return;
      if (el.width === 0 || el.height === 0) { startLoop(); return; }

      try {
        const p = preset;
        const elapsed = (performance.now() - startedAt) / 1000;

        gl.useProgram(program);
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

        const [rA, gA, bA] = hexToRgb(p.colorA);
        const [rB, gB, bB] = hexToRgb(p.colorB);
        const [rC, gC, bC] = hexToRgb(p.colorC);

        gl.uniform1f(uniforms.uTime,       elapsed * p.speed);
        gl.uniform2f(uniforms.uResolution, el.width, el.height);
        gl.uniform2f(uniforms.uMouse,      mouseX, mouseY);
        gl.uniform1f(uniforms.uWarp,       p.warp);
        gl.uniform1f(uniforms.uRipple,     p.ripple);
        gl.uniform1f(uniforms.uChrome,     p.chrome);
        gl.uniform1f(uniforms.uContrast,   p.contrast);
        gl.uniform1f(uniforms.uGrain,      p.grain);
        gl.uniform1f(uniforms.uPointer,    interactive ? p.pointer : 0);
        gl.uniform1f(uniforms.uClouds,     p.clouds);
        gl.uniform2f(uniforms.uCenter,     p.centerX, p.centerY);
        gl.uniform1f(uniforms.uCenterSize, p.centerSize);
        gl.uniform3f(uniforms.uColorA,     rA, gA, bA);
        gl.uniform3f(uniforms.uColorB,     rB, gB, bB);
        gl.uniform3f(uniforms.uColorC,     rC, gC, bC);

        gl.drawArrays(gl.TRIANGLES, 0, 3);

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

    updateStatus('rendering');
    startLoop();

    // ─── Cleanup ──────────────────────────────────────────────────────
    return () => {
      disposed = true;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interactive, preset]);

  return (
    <>
      <div className="hero__fallback" aria-hidden="true" />
      <canvas
        ref={canvasRef}
        className="hero__canvas"
        data-webgl-status={status}
        aria-hidden="true"
      />
      {debugParamsRef.current.debug ? (
        <output className="hero__webgl-debug" aria-live="off">
          WebGL: {status}
        </output>
      ) : null}
    </>
  );
}
