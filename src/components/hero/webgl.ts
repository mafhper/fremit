export type ShaderUniforms = Record<string, WebGLUniformLocation | null>;

function withLineNumbers(source: string): string {
  return source
    .split('\n')
    .map((line, index) => `${String(index + 1).padStart(3, ' ')} | ${line}`)
    .join('\n');
}

export function createShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string,
  label: string,
): WebGLShader {
  if (gl.isContextLost()) {
    throw new Error(`${label} shader: WebGL context is lost before compilation`);
  }

  const shader = gl.createShader(type);
  if (!shader) throw new Error(`Failed to create ${label} shader`);

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (gl.isContextLost()) {
    gl.deleteShader(shader);
    throw new Error(`${label} shader: WebGL context was lost during compilation`);
  }

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) || 'unknown error';
    const glError = gl.getError();

    console.error(`[WebGL] ${label} shader compilation failed:`, log);
    console.error(`[WebGL] ${label} shader gl.getError:`, glError);
    console.error(`[WebGL] ${label} source:\n${withLineNumbers(source)}`);

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

  let fragmentShader: WebGLShader | null = null;
  let program: WebGLProgram | null = null;

  try {
    fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource, 'fragment');

    program = gl.createProgram();
    if (!program) throw new Error('Failed to create program');

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (gl.isContextLost()) {
      throw new Error('Program linking failed: WebGL context was lost');
    }

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(program) || 'Program linking failed';
      const glError = gl.getError();

      console.error('[WebGL] program linking failed:', log);
      console.error('[WebGL] program link gl.getError:', glError);

      throw new Error(log);
    }

    const numUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    const uniforms: ShaderUniforms = {};

    for (let i = 0; i < numUniforms; i += 1) {
      const info = gl.getActiveUniform(program, i);
      if (info) {
        uniforms[info.name] = gl.getUniformLocation(program, info.name);
      }
    }

    return { program, uniforms };
  } catch (error) {
    if (program) gl.deleteProgram(program);
    throw error;
  } finally {
    gl.deleteShader(vertexShader);
    if (fragmentShader) gl.deleteShader(fragmentShader);
  }
}

export function createFullScreenTriangle(gl: WebGLRenderingContext): WebGLBuffer {
  const positions = new Float32Array([-1, -1, 3, -1, -1, 3]);
  const buffer = gl.createBuffer();

  if (!buffer) {
    throw new Error('Failed to create full-screen triangle buffer');
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

  return buffer;
}

export function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.trim();

  if (!/^#[0-9a-fA-F]{6}$/.test(normalized)) {
    console.warn(`[WebGL] Invalid hex color "${hex}". Falling back to black.`);
    return [0, 0, 0];
  }

  const value = Number.parseInt(normalized.slice(1), 16);

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

  const contextIds = ['webgl', 'experimental-webgl'] as const;

  for (const id of contextIds) {
    const ctx = canvas.getContext(id, opts) as WebGLRenderingContext | null;

    if (ctx && !ctx.isContextLost()) {
      return ctx;
    }
  }

  return null;
}

/**
 * Apenas para testes manuais de context loss.
 * Não chamar no cleanup normal de componentes React.
 */
export function forceLoseWebGLContextForDebug(gl: WebGLRenderingContext) {
  const extension = gl.getExtension('WEBGL_lose_context');
  extension?.loseContext();
}
