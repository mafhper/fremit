export type ShaderUniforms = Record<string, WebGLUniformLocation | null>;

export function createShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string,
  label: string,
): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error(`Failed to create ${label} shader`);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) || 'unknown error';
    const snippet = source.substring(0, 200);
    console.error(`[WebGL] ${label} shader compilation failed:`, log);
    console.error(`[WebGL] ${label} source start:`, snippet);
    gl.deleteShader(shader);
    throw new Error(`${label} shader: ${log}`);
  }
  return shader;
}

export function createProgram(
  gl: WebGLRenderingContext,
  vertexSource: string,
  fragmentSource: string,
): { program: WebGLProgram; uniforms: ShaderUniforms } {
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource, 'vertex');
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource, 'fragment');

  const program = gl.createProgram();
  if (!program) throw new Error('Failed to create program');
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program) || 'Program linking failed';
    gl.deleteProgram(program);
    throw new Error(log);
  }

  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  const numUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
  const uniforms: ShaderUniforms = {};
  for (let i = 0; i < numUniforms; i++) {
    const info = gl.getActiveUniform(program, i);
    if (info) {
      uniforms[info.name] = gl.getUniformLocation(program, info.name);
    }
  }

  return { program, uniforms };
}

export function createFullScreenTriangle(gl: WebGLRenderingContext): WebGLBuffer {
  const positions = new Float32Array([-1, -1, 3, -1, -1, 3]);
  const buffer = gl.createBuffer();
  if (!buffer) throw new Error('Failed to create buffer');
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
  return buffer;
}

export function hexToRgb(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16);
  return [
    ((value >> 16) & 255) / 255,
    ((value >> 8) & 255) / 255,
    (value & 255) / 255,
  ];
}

export function getWebGLContext(canvas: HTMLCanvasElement): WebGLRenderingContext | null {
  const opts: WebGLContextAttributes = {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: false,
  };

  const ctx = canvas.getContext('webgl', opts);
  if (ctx) return ctx as WebGLRenderingContext;

  const ctx2 = canvas.getContext('webgl2', opts);
  if (ctx2) {
    console.log('[WebGL] Using webgl2 context');
    return ctx2 as WebGLRenderingContext;
  }

  return null;
}

export function destroyContext(gl: WebGLRenderingContext): void {
  try {
    const ext = gl.getExtension('WEBGL_lose_context');
    ext?.loseContext();
  } catch {
    // Extensão não disponível em todos os browsers — falha silenciosa é aceitável
  }
}
