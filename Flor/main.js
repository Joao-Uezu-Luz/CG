const canvas = document.getElementById("canvas");
const gl = canvas.getContext("webgl2");

if (!gl) {
    throw new Error("WebGL 2 não é suportado.");
}

// ----------------------------------------------------------------
// 1. FUNÇÃO PARA CRIAR CÍRCULO
// ----------------------------------------------------------------
function createCircle(radius, segments = 32) {
    const vertices = [];
    vertices.push(0.0, 0.0); // Centro
    
    for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * 2 * Math.PI;
        vertices.push(radius * Math.cos(angle), radius * Math.sin(angle));
    }
    
    return new Float32Array(vertices);
}

// ----------------------------------------------------------------
// 2. FUNÇÃO PARA CRIAR PÉTALA (círculo deformado)
// ----------------------------------------------------------------
function createPetal(radius, scaleX, scaleY, segments = 16) {
    const vertices = [];
    vertices.push(0.0, 0.0); // Centro
    
    for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * 2 * Math.PI;
        const r = radius * (0.6 + 0.4 * Math.cos(angle * 2));
        const x = r * Math.cos(angle) * scaleX;
        const y = r * Math.sin(angle) * scaleY;
        vertices.push(x, y);
    }
    
    return new Float32Array(vertices);
}

// ----------------------------------------------------------------
// 3. VÉRTICES DA FLOR
// ----------------------------------------------------------------

// CAULE (retângulo)
const stemVertices = new Float32Array([
    -0.04, -0.8,
     0.04, -0.8,
     0.04,  0.1,
    -0.04,  0.1
]);

// MIOLO (círculo)
const centerVertices = createCircle(0.12, 24);

// PÉTALAS (8 pétalas)
const numPetals = 8;
const petalVertices = [];
const petalPositions = [];
const petalRotations = [];
const petalColors = [];

for (let i = 0; i < numPetals; i++) {
    const angle = (i / numPetals) * 2 * Math.PI;
    petalVertices.push(createPetal(0.28, 0.5, 0.2, 12));
    petalPositions.push([0.22 * Math.cos(angle), 0.22 * Math.sin(angle) + 0.1]);
    petalRotations.push(angle);
    petalColors.push([
        0.8 + 0.2 * Math.random(),
        0.1 + 0.2 * Math.random(),
        0.4 + 0.3 * Math.random()
    ]);
}

// ----------------------------------------------------------------
// 4. VERTEX SHADER
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
// 5. FRAGMENT SHADER
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
// 6. COMPILAR SHADERS
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
// 7. CRIAR PROGRAMA
// ----------------------------------------------------------------
const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);

if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program));
}

// ----------------------------------------------------------------
// 8. LOCALIZAÇÕES DOS ATRIBUTOS E UNIFORMES
// ----------------------------------------------------------------
const positionLocation = gl.getAttribLocation(program, "aPosition");
const colorLocation = gl.getAttribLocation(program, "aColor");
const translationLocation = gl.getUniformLocation(program, "uTranslation");
const rotationLocation = gl.getUniformLocation(program, "uRotation");
const scaleLocation = gl.getUniformLocation(program, "uScale");

// ----------------------------------------------------------------
// 9. FUNÇÃO PARA DESENHAR UMA PARTE
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
// 10. FUNÇÃO PARA CRIAR CORES PARA UMA PARTE
// ----------------------------------------------------------------
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
// 11. PREPARAR CORES
// ----------------------------------------------------------------
const stemColors = createColors(stemVertices, 0.2, 0.6, 0.1);
const centerColors = createColors(centerVertices, 1.0, 0.8, 0.0);

const petalColorsList = [];
for (let i = 0; i < numPetals; i++) {
    const color = petalColors[i];
    petalColorsList.push(createColors(petalVertices[i], color[0], color[1], color[2]));
}

// ----------------------------------------------------------------
// 12. LIMPAR TELA E DESENHAR
// ----------------------------------------------------------------
gl.clearColor(0.05, 0.05, 0.08, 1.0);
gl.clear(gl.COLOR_BUFFER_BIT);

gl.useProgram(program);

// --- DESENHAR CAULE ---
drawPart(stemVertices, stemColors, [0, 0], 0, [1, 1]);

// --- DESENHAR PÉTALAS ---
for (let i = 0; i < numPetals; i++) {
    drawPart(
        petalVertices[i],
        petalColorsList[i],
        petalPositions[i],
        petalRotations[i],
        [1, 1]
    );
}

// --- DESENHAR MIOLO ---
drawPart(centerVertices, centerColors, [0, 0.1], 0, [1, 1]);

