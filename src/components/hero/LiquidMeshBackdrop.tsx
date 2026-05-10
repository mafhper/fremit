/**
 * LiquidMeshBackdrop.tsx
 * Canvas WebGL decorativo para o hero.
 *
 * Shader rico com FBM noise, 2-light specular, cloud layer, pointer
 * interaction e center glow — mesh multicolorida inspirada no imaginizim.
 *
 * Todos os uniforms são redefinidos a cada frame (padrão imaginizim)
 * para garantir que o shader sempre receba valores corretos, mesmo com
 * context loss, resize, ou troca de tema entre frames.
 */

import { useEffect, useRef } from 'react';
import { FRAGMENT_SHADER, VERTEX_SHADER } from './shader';
import {
  createFullScreenTriangle,
  createProgram,
  destroyContext,
  getWebGLContext,
  hexToRgb,
} from './webgl';
import { useThemePreset } from './useThemePreset';

export function LiquidMeshBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const preset = useThemePreset();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let destroyed = false;
    let rafId = 0;
    let isVisible = true;
    let gl: WebGLRenderingContext | null = null;

    // ─── WebGL context ──────────────────────────────────────────────────
    gl = getWebGLContext(canvas);
    if (!gl) {
      canvas.style.display = 'none';
      return;
    }

    // ─── Compilar shaders ───────────────────────────────────────────────
    let program: WebGLProgram;
    let uniforms: Record<string, WebGLUniformLocation | null>;
    try {
      ({ program, uniforms } = createProgram(gl, VERTEX_SHADER, FRAGMENT_SHADER));
    } catch (err) {
      console.error('[LiquidMesh] Shader error:', err);
      canvas.style.display = 'none';
      destroyContext(gl);
      return;
    }

    // ─── Full-screen triangle ───────────────────────────────────────────
    const buffer = createFullScreenTriangle(gl);
    const posLoc = gl.getAttribLocation(program, 'aPosition');

    // ─── Estado de interação ────────────────────────────────────────────
    let mouseX = 0.5;
    let mouseY = 0.5;

    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = (e.clientX - rect.left) / rect.width;
      mouseY = 1.0 - (e.clientY - rect.top) / rect.height;
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    // ─── ResizeObserver ─────────────────────────────────────────────────
    const dpr = Math.min(window.devicePixelRatio, 1.5);
    let canvasW = 0;
    let canvasH = 0;

    function syncSize() {
      if (!gl || !canvas) return;
      const { width, height } = canvas.getBoundingClientRect();
      const w = Math.floor(width * dpr);
      const h = Math.floor(height * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
      canvasW = canvas.width;
      canvasH = canvas.height;
    }

    const ro = new ResizeObserver(syncSize);
    ro.observe(canvas);
    syncSize();

    // ─── IntersectionObserver ───────────────────────────────────────────
    const io = new IntersectionObserver(
      ([entry]) => { isVisible = entry.isIntersecting; },
      { threshold: 0.01 },
    );
    io.observe(canvas);

    // ─── visibilitychange ──────────────────────────────────────────────
    const onVisibilityChange = () => {
      isVisible = document.visibilityState === 'visible';
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    // ─── Loop ──────────────────────────────────────────────────────────
    const t0 = performance.now();

    function render() {
      if (destroyed) return;
      rafId = requestAnimationFrame(render);
      if (!isVisible) return;
      if (!gl || !canvas || canvasW === 0 || canvasH === 0) return;

      const elapsed = (performance.now() - t0) / 1000;

      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

      const [rA, gA, bA] = hexToRgb(preset.colorA);
      const [rB, gB, bB] = hexToRgb(preset.colorB);
      const [rC, gC, bC] = hexToRgb(preset.colorC);

      gl.uniform1f(uniforms['uTime'],       elapsed * preset.speed);
      gl.uniform2f(uniforms['uResolution'], canvasW, canvasH);
      gl.uniform2f(uniforms['uMouse'],      mouseX, mouseY);
      gl.uniform1f(uniforms['uWarp'],       preset.warp);
      gl.uniform1f(uniforms['uRipple'],     preset.ripple);
      gl.uniform1f(uniforms['uChrome'],     preset.chrome);
      gl.uniform1f(uniforms['uContrast'],   preset.contrast);
      gl.uniform1f(uniforms['uGrain'],      preset.grain);
      gl.uniform1f(uniforms['uPointer'],    preset.pointer);
      gl.uniform1f(uniforms['uClouds'],     preset.clouds);
      gl.uniform2f(uniforms['uCenter'],     preset.centerX, preset.centerY);
      gl.uniform1f(uniforms['uCenterSize'], preset.centerSize);
      gl.uniform3f(uniforms['uColorA'],     rA, gA, bA);
      gl.uniform3f(uniforms['uColorB'],     rB, gB, bB);
      gl.uniform3f(uniforms['uColorC'],     rC, gC, bC);

      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    rafId = requestAnimationFrame(render);

    // ─── Cleanup ───────────────────────────────────────────────────────
    return () => {
      destroyed = true;
      cancelAnimationFrame(rafId);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (gl) destroyContext(gl);
    };
  }, [preset]);

  return (
    <>
      <div className="hero__fallback" aria-hidden="true" />
      <canvas
        ref={canvasRef}
        className="hero__canvas"
        aria-hidden="true"
      />
    </>
  );
}
