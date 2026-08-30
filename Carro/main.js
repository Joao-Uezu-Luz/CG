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
// 2. VÉRTICES DO CARRO
// ----------------------------------------------------------------

// CARROCERIA
const bodyVerts = createRect(0.7, 0.3);
const bodyColors = createColors(bodyVerts, 0.9, 0.1, 0.1);

// CABINE
const cabinVerts = createRect(0.35, 0.2);
const cabinColors = createColors(cabinVerts, 0.4, 0.6, 0.9);

// RODAS
const wheelVerts = createCircle(0.09, 20);
const wheelColors = createColors(wheelVerts, 0.05, 0.05, 0.05);

// AROS DAS RODAS
const rimVerts = createCircle(0.05, 16);
const rimColors = createColors(rimVerts, 0.6, 0.6);

// FARÓIS
const lightVerts = createCircle(0.04, 12);
const lightColors = createColors(lightVerts, 1.0, 1.0, 0.7);

// PARA-CHOQUE
const bumperVerts = createRect(0.65, 0.05);
const bumperColors = createColors(bumperVerts, 0.1, 0.1, 0.1);

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
// 9. LIMPAR TELA E DESENHAR
// ----------------------------------------------------------------
gl.clearColor(0.05, 0.05, 0.1, 1.0);
gl.clear(gl.COLOR_BUFFER_BIT);

gl.useProgram(program);

// --- CARROCERIA ---
drawPart(bodyVerts, bodyColors, [0, -0.05], 0, [1, 1]);

// --- CABINE ---
drawPart(cabinVerts, cabinColors, [0.05, 0.15], 0, [1, 1]);

// --- RODAS ---
drawPart(wheelVerts, wheelColors, [-0.25, -0.2], 0, [1, 1]);
drawPart(rimVerts, rimColors, [-0.25, -0.2], 0, [1, 1]);

drawPart(wheelVerts, wheelColors, [0.25, -0.2], 0, [1, 1]);
drawPart(rimVerts, rimColors, [0.25, -0.2], 0, [1, 1]);

drawPart(wheelVerts, wheelColors, [-0.25, -0.2], 0, [1, 1]);
drawPart(rimVerts, rimColors, [-0.25, -0.2], 0, [1, 1]);

drawPart(wheelVerts, wheelColors, [0.25, -0.2], 0, [1, 1]);
drawPart(rimVerts, rimColors, [0.25, -0.2], 0, [1, 1]);

// --- FARÓIS ---
drawPart(lightVerts, lightColors, [-0.28, 0.08], 0, [1, 1]);
drawPart(lightVerts, lightColors, [0.28, 0.08], 0, [1, 1]);

// --- PARA-CHOQUE ---
drawPart(bumperVerts, bumperColors, [0, -0.2], 0, [1, 1]);

