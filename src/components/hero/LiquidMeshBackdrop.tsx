/**
 * LiquidMeshBackdrop.tsx
 * Canvas WebGL decorativo para o hero.
 *
 * Shader rico com FBM noise, 2-light specular, cloud layer, pointer
 * interaction e center glow — mesh multicolorida inspirada no imaginizim.
 *
 * Correções aplicadas:
 *  - ResizeObserver em vez de leitura única no mount (canvas.width/height nunca fica 0)
 *  - Flag `destroyed` protege o loop de animação contra React Strict Mode e HMR
 *  - destroyContext() libera o contexto WebGL no cleanup (evita acúmulo de contextos)
 *  - useThemePreset() substitui isDarkTheme() — reage a mudanças de tema em tempo real
 *  - IntersectionObserver só pausa após os primeiros frames (evita tela branca em layout shift)
 *  - getWebGLContext() usa alpha: false e tenta webgl2 como fallback
 *  - Fallback CSS visível quando WebGL não está disponível
 *  - uResolution atualizado via ResizeObserver + render loop
 *  - pointermove em vez de mousemove (touch support)
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

    // ─── estado do loop ───────────────────────────────────────────────────
    let destroyed = false;
    let rafId     = 0;
    let frameCount = 0;
    let isVisible  = true;
    let gl: WebGLRenderingContext | null = null;

    // ─── obter contexto ───────────────────────────────────────────────────
    gl = getWebGLContext(canvas);
    if (!gl) {
      canvas.style.display = 'none';
      return;
    }

    // ─── compilar programa ────────────────────────────────────────────────
    let program: WebGLProgram;
    let uniforms: Record<string, WebGLUniformLocation | null>;
    try {
      ({ program, uniforms } = createProgram(gl, VERTEX_SHADER, FRAGMENT_SHADER));
    } catch (err) {
      console.error('[LiquidMesh] Shader compile/link error:', err);
      canvas.style.display = 'none';
      destroyContext(gl);
      return;
    }

    // ─── buffer full-screen ───────────────────────────────────────────────
    const buffer = createFullScreenTriangle(gl);
    const posLoc = gl.getAttribLocation(program, 'aPosition');

    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    // ─── uniforms de cor (preset) ─────────────────────────────────────────
    const [rA, gA, bA] = hexToRgb(preset.colorA);
    const [rB, gB, bB] = hexToRgb(preset.colorB);
    const [rC, gC, bC] = hexToRgb(preset.colorC);

    gl.uniform3f(uniforms['uColorA'], rA, gA, bA);
    gl.uniform3f(uniforms['uColorB'], rB, gB, bB);
    gl.uniform3f(uniforms['uColorC'], rC, gC, bC);
    gl.uniform1f(uniforms['uWarp'],     preset.warp);
    gl.uniform1f(uniforms['uRipple'],   preset.ripple);
    gl.uniform1f(uniforms['uChrome'],   preset.chrome);
    gl.uniform1f(uniforms['uContrast'], preset.contrast);
    gl.uniform1f(uniforms['uGrain'],    preset.grain);
    gl.uniform1f(uniforms['uPointer'],  preset.pointer);
    gl.uniform1f(uniforms['uClouds'],   preset.clouds);
    gl.uniform2f(uniforms['uCenter'],   preset.centerX, preset.centerY);
    gl.uniform1f(uniforms['uCenterSize'], preset.centerSize);

    // ─── mouse / pointer interaction ──────────────────────────────────────
    let mouseX = 0.5;
    let mouseY = 0.5;

    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = (e.clientX - rect.left) / rect.width;
      mouseY = 1.0 - (e.clientY - rect.top) / rect.height;
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    // ─── ResizeObserver — mantém canvas.width/height sempre corretos ──────
    const dpr = Math.min(window.devicePixelRatio, 1.5);

    function syncSize() {
      if (!gl || !canvas) return;
      const { width, height } = canvas.getBoundingClientRect();
      const w = Math.floor(width * dpr);
      const h = Math.floor(height * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width  = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
      // uResolution precisa estar sempre atualizado para o shader
      gl.uniform2f(uniforms['uResolution'], canvas.width, canvas.height);
    }

    const ro = new ResizeObserver(syncSize);
    ro.observe(canvas);
    syncSize(); // leitura inicial

    // ─── IntersectionObserver ─────────────────────────────────────────────
    const PAUSE_AFTER_FRAMES = 10;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (frameCount >= PAUSE_AFTER_FRAMES) {
          isVisible = entry.isIntersecting;
        }
      },
      { threshold: 0.01 },
    );
    io.observe(canvas);

    // ─── visibilitychange ─────────────────────────────────────────────────
    const onVisibilityChange = () => {
      if (frameCount >= PAUSE_AFTER_FRAMES) {
        isVisible = document.visibilityState === 'visible';
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    // ─── loop de animação ─────────────────────────────────────────────────
    const t0 = performance.now();

    function render() {
      if (destroyed) return;

      rafId = requestAnimationFrame(render);

      if (!isVisible && frameCount >= PAUSE_AFTER_FRAMES) return;
      if (!canvas || canvas.width === 0 || canvas.height === 0) return;

      const elapsed = (performance.now() - t0) / 1000;

      if (!gl) return;
      gl.uniform1f(uniforms['uTime'],  elapsed * preset.speed);
      gl.uniform2f(uniforms['uMouse'], mouseX, mouseY);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      frameCount++;
    }

    rafId = requestAnimationFrame(render);

    // ─── cleanup ──────────────────────────────────────────────────────────
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
