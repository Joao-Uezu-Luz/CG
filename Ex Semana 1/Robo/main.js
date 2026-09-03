const canvas = document.getElementById("canvas");
const gl = canvas.getContext("webgl2");

if (!gl) {
    throw new Error("WebGL 2 não é suportado.");
}

// ----------------------------------------------------------------
// 1. FUNÇÕES AUXILIARES
// ----------------------------------------------------------------
function createCircle(radius, segments = 24) {
    const vertices = [];
    vertices.push(0.0, 0.0);
    
    for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * 2 * Math.PI;
        vertices.push(radius * Math.cos(angle), radius * Math.sin(angle));
    }
    
    return new Float32Array(vertices);
}

function createRect(width, height) {
    const w = width / 2;
    const h = height / 2;
    
    return new Float32Array([
        -w, -h,
         w, -h,
         w,  h,
        -w,  h
    ]);
}

function createColors(vertices, r, g, b) {
    const colors = new Float32Array((vertices.length / 2) * 3);
    for (let i = 0; i < vertices.length / 2; i++) {
        colors[i * 3] = r;
        colors[i * 3 + 1] = g;
        colors[i * 3 + 2] = b;
    }
    return colors;
}

// ----------------------------------------------------------------
// 2. VÉRTICES DO ROBÔ
// ----------------------------------------------------------------

// CORPO
const bodyVerts = createRect(0.5, 0.6);
const bodyColors = createColors(bodyVerts, 0.2, 0.4, 0.8);

// CABEÇA
const headVerts = createRect(0.35, 0.35);
const headColors = createColors(headVerts, 0.7, 0.7, 0.8);

// OLHOS
const eyeVerts = createCircle(0.05, 16);
const eyeColors = createColors(eyeVerts, 0.0, 0.0, 0.0);

// PERNAS
const legVerts = createRect(0.1, 0.25);
const legColors = createColors(legVerts, 0.1, 0.2, 0.5);


// ----------------------------------------------------------------
// 3. VERTEX SHADER
// ----------------------------------------------------------------
const vertexShaderSource = `#version 300 es

in vec2 aPosition;
in vec3 aColor;

uniform vec2 uTranslation;
uniform float uRotation;
uniform vec2 uScale;

out vec3 vColor;

void main() {
    vec2 pos = aPosition;
    
    pos = pos * uScale;
    
    float cosA = cos(uRotation);
    float sinA = sin(uRotation);
    pos = vec2(
        pos.x * cosA - pos.y * sinA,
        pos.x * sinA + pos.y * cosA
    );
    
    pos = pos + uTranslation;
    
    gl_Position = vec4(pos, 0.0, 1.0);
    vColor = aColor;
}

`;

// ----------------------------------------------------------------
// 4. FRAGMENT SHADER
// ----------------------------------------------------------------
const fragmentShaderSource = `#version 300 es

precision mediump float;

in vec3 vColor;
out vec4 outColor;

void main() {
    outColor = vec4(vColor, 1.0);
}

`;

// ----------------------------------------------------------------
// 5. COMPILAR SHADERS
// ----------------------------------------------------------------
function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const error = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error("Erro no shader: " + error);
    }
    return shader;
}

const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

// ----------------------------------------------------------------
// 6. CRIAR PROGRAMA
// ----------------------------------------------------------------
const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);

if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program));
}

// ----------------------------------------------------------------
// 7. LOCALIZAÇÕES
// ----------------------------------------------------------------
const positionLocation = gl.getAttribLocation(program, "aPosition");
const colorLocation = gl.getAttribLocation(program, "aColor");
const translationLocation = gl.getUniformLocation(program, "uTranslation");
const rotationLocation = gl.getUniformLocation(program, "uRotation");
const scaleLocation = gl.getUniformLocation(program, "uScale");

// ----------------------------------------------------------------
// 8. FUNÇÃO PARA DESENHAR
// ----------------------------------------------------------------
function drawPart(vertices, colors, translation, rotation, scale) {
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    
    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);
    
    gl.enableVertexAttribArray(colorLocation);
    gl.vertexAttribPointer(colorLocation, 3, gl.FLOAT, false, 0, 0);
    
    gl.uniform2f(translationLocation, translation[0], translation[1]);
    gl.uniform1f(rotationLocation, rotation);
    gl.uniform2f(scaleLocation, scale[0], scale[1]);
    
    const vertexCount = vertices.length / 2;
    gl.drawArrays(gl.TRIANGLE_FAN, 0, vertexCount);
}

// ----------------------------------------------------------------
// 9. LIMPAR TELA E DESENHAR (SEM ANIMAÇÃO)
// ----------------------------------------------------------------
gl.clearColor(0.05, 0.05, 0.1, 1.0);
gl.clear(gl.COLOR_BUFFER_BIT);

gl.useProgram(program);

// --- CORPO ---
drawPart(bodyVerts, bodyColors, [0, -0.05], 0, [1, 1]);

// --- CABEÇA ---
drawPart(headVerts, headColors, [0, 0.35], 0, [1, 1]);

// --- OLHO ESQUERDO ---
drawPart(eyeVerts, eyeColors, [-0.08, 0.4], 0, [1, 1]);

// --- OLHO DIREITO ---
drawPart(eyeVerts, eyeColors, [0.08, 0.4], 0, [1, 1]);


// --- PERNA ESQUERDA ---
drawPart(legVerts, legColors, [-0.12, -0.35], 0, [1, 1]);

// --- PERNA DIREITA ---
drawPart(legVerts, legColors, [0.12, -0.35], 0, [1, 1]);


