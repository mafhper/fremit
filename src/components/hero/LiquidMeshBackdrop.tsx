import { useEffect, useRef } from 'react';
import { VERTEX_SHADER, FRAGMENT_SHADER } from './shader';
import { lightPreset, darkPreset, type LiquidMeshPreset } from './presets';
import { createProgram, createFullScreenTriangle, hexToRgb, isDarkTheme } from './webgl';
import { useReducedMotion } from './useReducedMotion';

const RESOLUTION_CAP = 1.5;
const MOUSE_LERP = 0.055;

export function LiquidMeshBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    const root = rootRef.current;
    if (!canvas || !root) return;

    if (reduced) {
      canvas.style.display = 'none';
      return;
    }

    const ctx = canvas.getContext('webgl', {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'high-performance',
    });

    if (!ctx) {
      canvas.style.display = 'none';
      return;
    }

    let program: WebGLProgram;
    let buffer: WebGLBuffer;
    let uniforms: Record<string, WebGLUniformLocation | null>;
    let running = true;
    let rafId = 0;
    let sceneTime = 0;
    let lastTime = 0;
    const gl = ctx;

    const mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };

    try {
      const result = createProgram(gl, VERTEX_SHADER, FRAGMENT_SHADER);
      program = result.program;
      uniforms = result.uniforms;
      buffer = createFullScreenTriangle(gl);
    } catch {
      canvas.style.display = 'none';
      return;
    }

    gl.useProgram(program);

    const positionLoc = gl.getAttribLocation(program, 'aPosition');
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

    function getPreset(): LiquidMeshPreset {
      return isDarkTheme() ? darkPreset : lightPreset;
    }

    function resize() {
      const cvs = canvas;
      if (!cvs) return;
      const dpr = Math.min(window.devicePixelRatio || 1, RESOLUTION_CAP);
      const w = root!.clientWidth;
      const h = root!.clientHeight;
      if (!w || !h) return;
      const bw = Math.floor(w * dpr);
      const bh = Math.floor(h * dpr);
      if (cvs.width !== bw || cvs.height !== bh) {
        cvs.width = bw;
        cvs.height = bh;
        gl.viewport(0, 0, bw, bh);
      }
    }

    function render(time: number) {
      if (!running) return;
      rafId = requestAnimationFrame(render);

      const preset = getPreset();

      if (lastTime === 0) lastTime = time;
      const delta = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;

      sceneTime += delta * preset.speed;

      mouse.x += (mouse.tx - mouse.x) * MOUSE_LERP;
      mouse.y += (mouse.ty - mouse.y) * MOUSE_LERP;

      resize();

      const [rA, gA, bA] = hexToRgb(preset.colorA);
      const [rB, gB, bB] = hexToRgb(preset.colorB);
      const [rC, gC, bC] = hexToRgb(preset.colorC);

      gl.uniform1f(uniforms.uTime, sceneTime);
      gl.uniform2f(uniforms.uResolution, canvas!.width, canvas!.height);
      gl.uniform2f(uniforms.uMouse, mouse.x, mouse.y);
      gl.uniform1f(uniforms.uWarp, preset.warp);
      gl.uniform1f(uniforms.uRipple, preset.ripple);
      gl.uniform1f(uniforms.uChrome, preset.chrome);
      gl.uniform1f(uniforms.uContrast, preset.contrast);
      gl.uniform1f(uniforms.uGrain, preset.grain);
      gl.uniform1f(uniforms.uPointer, preset.pointer ? 1.0 : 0.0);
      gl.uniform1f(uniforms.uClouds, preset.clouds);
      gl.uniform2f(uniforms.uCenter, preset.centerX, preset.centerY);
      gl.uniform1f(uniforms.uCenterSize, preset.centerSize);
      gl.uniform3f(uniforms.uColorA, rA, gA, bA);
      gl.uniform3f(uniforms.uColorB, rB, gB, bB);
      gl.uniform3f(uniforms.uColorC, rC, gC, bC);

      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    function onPointerMove(e: PointerEvent) {
      const rect = root!.getBoundingClientRect();
      mouse.tx = (e.clientX - rect.left) / rect.width;
      mouse.ty = 1.0 - (e.clientY - rect.top) / rect.height;
    }

    function onVisibilityChange() {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(rafId);
      } else {
        running = true;
        lastTime = 0;
        rafId = requestAnimationFrame(render);
      }
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const isVisible = entries[0]?.isIntersecting ?? true;
        if (!isVisible) {
          running = false;
          cancelAnimationFrame(rafId);
        } else if (!document.hidden) {
          running = true;
          lastTime = 0;
          rafId = requestAnimationFrame(render);
        }
      },
      { threshold: 0.05 },
    );

    observer.observe(root);

    window.addEventListener('resize', resize);
    root.addEventListener('pointermove', onPointerMove);
    document.addEventListener('visibilitychange', onVisibilityChange);

    rafId = requestAnimationFrame(render);

    return () => {
      running = false;
      cancelAnimationFrame(rafId);
      observer.disconnect();
      window.removeEventListener('resize', resize);
      root.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (gl) {
        gl.deleteBuffer(buffer);
        gl.deleteProgram(program);
      }
    };
  }, [reduced]);

  return (
    <div ref={rootRef} className="liquid-mesh-root" aria-hidden="true">
      <canvas ref={canvasRef} className="liquid-mesh-canvas" />
    </div>
  );
}
