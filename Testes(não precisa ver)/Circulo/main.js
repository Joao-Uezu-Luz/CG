const canvas = document.getElementById("canvas");
const gl = canvas.getContext("webgl2");

if (!gl) {
    throw new Error("WebGL 2 não é suportado.");
}

// ==============================================
// 1. GERAR VÉRTICES DO CÍRCULO (Triângulo Fan)
// ==============================================

function createCircleVertices(radius, segments) {
    const vertices = [];
    
    // Centro do círculo (x, y)
    vertices.push(0.0, 0.0);
    
    // Pontos na circunferência
    for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * 2 * Math.PI;
        const x = radius * Math.cos(angle);
        const y = radius * Math.sin(angle);
        vertices.push(x, y);
    }
    
    return new Float32Array(vertices);
}

// Círculo com 32 segmentos (triângulos)
const segments = 32;
const radius = 0.7;
const vertices = createCircleVertices(radius, segments);

console.log(`Total de vértices: ${vertices.length / 2}`);
console.log(`Total de triângulos: ${segments}`);

// ==============================================
// 2. BUFFER
// ==============================================

const buffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

// ==============================================
// 3. VERTEX SHADER
// ==============================================

const vertexShaderSource = `#version 300 es

in vec2 aPosition;

void main() {
    gl_Position = vec4(aPosition, 0.0, 1.0);
}

`;

// ==============================================
// 4. FRAGMENT SHADER (Círculo com gradiente)
// ==============================================

const fragmentShaderSource = `#version 300 es

precision mediump float;

out vec4 outColor;

uniform vec2 uResolution;

void main() {
    // Gradiente radial do centro
    vec2 center = vec2(0.5, 0.5);
    vec2 uv = gl_FragCoord.xy / uResolution;
    float dist = distance(uv, center);
    
    // Cor: vermelho no centro, rosa nas bordas
    vec3 color1 = vec3(1.0, 0.0, 0.0);  // Vermelho
    vec3 color2 = vec3(1.0, 0.5, 0.5);  // Rosa
    
    // Mistura baseada na distância
    vec3 color = mix(color1, color2, dist);
    
    outColor = vec4(color, 1.0);
}

`;

// ==============================================
// 5. COMPILAR SHADERS
// ==============================================

function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const error = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error(error);
    }
    return shader;
}

const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

// ==============================================
// 6. PROGRAMA
// ==============================================

const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);

if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program));
}

// ==============================================
// 7. UNIFORMES
// ==============================================

const resolutionLocation = gl.getUniformLocation(program, "uResolution");

// ==============================================
// 8. ATRIBUTOS
// ==============================================

const positionLocation = gl.getAttribLocation(program, "aPosition");

gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
gl.enableVertexAttribArray(positionLocation);
gl.vertexAttribPointer(
    positionLocation,
    2,          // 2 componentes (x, y)
    gl.FLOAT,
    false,
    0,
    0
);

// ==============================================
// 9. RENDERIZAR
// ==============================================

gl.clearColor(0.1, 0.1, 0.1, 1.0);
gl.clear(gl.COLOR_BUFFER_BIT);

gl.useProgram(program);

// Passar resolução da tela
gl.uniform2f(resolutionLocation, canvas.width, canvas.height);

// TRIANGLE_FAN = triângulos compartilhando o primeiro vértice
gl.drawArrays(
    gl.TRIANGLE_FAN,    // Tipo: triângulo fan
    0,                  // Início
    segments + 2        // Total: centro + (segments + 1) pontos
);