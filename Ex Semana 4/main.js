const canvas = document.getElementById("canvas");
const gl = canvas.getContext("webgl2");

if (!gl) {
    throw new Error("WebGL 2 não é suportado.");
}

// ==================================================
// SHADERS
// ==================================================

const vertexShaderSource = `#version 300 es

in vec2 aPosition;

uniform mat3 u_viewTransform;
uniform mat3 u_modelTransform;

void main() {

    vec3 position =
        u_viewTransform *
        u_modelTransform *
        vec3(aPosition, 1.0);

    gl_Position =
        vec4(position.xy, 0.0, 1.0);
}
`;

const fragmentShaderSource = `#version 300 es

precision mediump float;

uniform vec3 uColor;

out vec4 outColor;

void main() {

    outColor =
        vec4(uColor, 1.0);
}
`;

// ==================================================
// CRIAÇÃO DE SHADERS E PROGRAMA
// ==================================================

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

function createProgram(gl, vertexShaderSource, fragmentShaderSource) {

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

    const program = gl.createProgram();

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(program));
    }

    return program;
}

const program = createProgram(gl, vertexShaderSource, fragmentShaderSource);

// ==================================================
// CLASSE RENDERER
// ==================================================

class Renderer {

    constructor(gl, program) {
        this.gl = gl;
        this.program = program;

        this.positionLocation = gl.getAttribLocation(program, "aPosition");
        this.colorLocation = gl.getUniformLocation(program, "uColor");
        this.viewTransformLocation = gl.getUniformLocation(program, "u_viewTransform");
        this.modelTransformLocation = gl.getUniformLocation(program, "u_modelTransform");

        this.viewTransform = m3.identity();
        this.verticesBuffer = gl.createBuffer();
    }

    defineViewTransform(viewTransform) {
        this.viewTransform = viewTransform;
    }

    draw(object) {
        const gl = this.gl;

        gl.bindBuffer(gl.ARRAY_BUFFER, this.verticesBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, object.vertices, gl.STATIC_DRAW);

        gl.enableVertexAttribArray(this.positionLocation);
        gl.vertexAttribPointer(this.positionLocation, 2, gl.FLOAT, false, 0, 0);

        gl.uniform3fv(this.colorLocation, object.color);

        gl.uniformMatrix3fv(this.modelTransformLocation, false, object.modelTransform);
        gl.uniformMatrix3fv(this.viewTransformLocation, false, this.viewTransform);

        gl.drawArrays(gl.TRIANGLES, 0, object.vertices.length / 2);
    }
}

// ==================================================
// FUNÇÕES AUXILIARES DE GEOMETRIA
// ==================================================

function rectangleVertices(x, y, width, height) {
    return [
        x, y,
        x + width, y + height,
        x, y + height,

        x, y,
        x + width, y,
        x + width, y + height
    ];
}

function circleVertices(radius, numSegments) {
    const vertices = [];

    for (let i = 0; i < numSegments; i++) {
        const theta1 = (i / numSegments) * 2 * Math.PI;
        const theta2 = ((i + 1) / numSegments) * 2 * Math.PI;

        vertices.push(0, 0);
        vertices.push(radius * Math.cos(theta1), radius * Math.sin(theta1));
        vertices.push(radius * Math.cos(theta2), radius * Math.sin(theta2));
    }

    return vertices;
}

// ==================================================
// VÉRTICES DO ROBÔ
// ==================================================

// CABEÇA (quadrado)
function robotHeadVertices() {
    const vertices = rectangleVertices(-0.15, 0.0, 0.3, 0.25);
    return new Float32Array(vertices);
}

// OLHO (círculo pequeno)
function robotEyeVertices() {
    const vertices = circleVertices(0.03, 12);
    return new Float32Array(vertices);
}

// CORPO (retângulo vertical)
function robotBodyVertices() {
    const vertices = rectangleVertices(-0.18, -0.4, 0.36, 0.4);
    return new Float32Array(vertices);
}

// BRAÇO (retângulo fino)
function robotArmVertices() {
    const vertices = rectangleVertices(-0.04, -0.25, 0.08, 0.25);
    return new Float32Array(vertices);
}

// PERNA (retângulo)
function robotLegVertices() {
    const vertices = rectangleVertices(-0.06, -0.3, 0.12, 0.3);
    return new Float32Array(vertices);
}

// ANTENA (linha fina)
function robotAntennaVertices() {
    const vertices = rectangleVertices(-0.01, 0.0, 0.02, 0.1);
    return new Float32Array(vertices);
}

// PONTA DA ANTENA (círculo)
function robotAntennaBallVertices() {
    const vertices = circleVertices(0.025, 10);
    return new Float32Array(vertices);
}

// CHÃO (linha horizontal)
function groundVertices() {
    const vertices = rectangleVertices(-1.8, -0.75, 3.6, 0.02);
    return new Float32Array(vertices);
}

// ==================================================
// CLASSE SCENE OBJECT (BASE)
// ==================================================

class SceneObject {

    constructor(vertices, color) {
        this.vertices = vertices;
        this.color = color;
        this.modelTransform = m3.identity();
    }

    updateModelTransform(modelTransform) {
        this.modelTransform = modelTransform;
    }

    draw(renderer) {
        renderer.draw(this);
    }
}

// ==================================================
// CLASSE ROBOT HEAD (CABEÇA)
// ==================================================

class RobotHead extends SceneObject {

    constructor() {
        super(
            robotHeadVertices(),
            new Float32Array([0.85, 0.85, 0.9]) // Cinza claro
        );

        this.angle = 0.0;
        this.angularSpeed = 0.02;

        // Olhos
        this.leftEye = new RobotEye(-0.06, 0.12);
        this.rightEye = new RobotEye(0.06, 0.12);
    }

    update() {
        // Cabeça gira suavemente
        this.angle += this.angularSpeed;
    }

    updateModelTransform(parentTransform) {
        // Cabeça fica acima do corpo com rotação própria
        const localTransform = m3.multiply(
            m3.translation(0.0, 0.4),
            m3.rotation(this.angle)
        );

        this.modelTransform = m3.multiply(parentTransform, localTransform);

        // Atualizar olhos
        this.leftEye.updateModelTransform(this.modelTransform);
        this.rightEye.updateModelTransform(this.modelTransform);
    }

    draw(renderer) {
        renderer.draw(this);
        this.leftEye.draw(renderer);
        this.rightEye.draw(renderer);
    }
}

// ==================================================
// CLASSE ROBOT EYE (OLHO)
// ==================================================

class RobotEye extends SceneObject {

    constructor(x, y) {
        super(
            robotEyeVertices(),
            new Float32Array([0.0, 0.0, 0.0]) // Preto
        );

        this.x = x;
        this.y = y;
    }

    updateModelTransform(parentTransform) {
        const localTransform = m3.translation(this.x, this.y);
        this.modelTransform = m3.multiply(parentTransform, localTransform);
    }
}

// ==================================================
// CLASSE ROBOT ANTENNA (ANTENA)
// ==================================================

class RobotAntenna extends SceneObject {

    constructor() {
        super(
            robotAntennaVertices(),
            new Float32Array([0.5, 0.5, 0.5]) // Cinza
        );

        this.ball = new AntennaBall();
    }

    update() {
        this.ball.update();
    }

    updateModelTransform(parentTransform) {
        // Antena fica acima da cabeça
        const localTransform = m3.translation(0.0, 0.25);
        this.modelTransform = m3.multiply(parentTransform, localTransform);

        // Ponta da antena
        this.ball.updateModelTransform(this.modelTransform);
    }

    draw(renderer) {
        renderer.draw(this);
        this.ball.draw(renderer);
    }
}

// ==================================================
// CLASSE ANTENNA BALL (PONTA DA ANTENA)
// ==================================================

class AntennaBall extends SceneObject {

    constructor() {
        super(
            robotAntennaBallVertices(),
            new Float32Array([1.0, 0.0, 0.0]) // Vermelho
        );

        this.pulse = 0.0;
    }

    update() {
        this.pulse += 0.1;
    }

    updateModelTransform(parentTransform) {
        const scale = 1.0 + 0.3 * Math.sin(this.pulse);
        const localTransform = m3.multiply(
            m3.translation(0.0, 0.1),
            m3.scaling(scale, scale)
        );

        this.modelTransform = m3.multiply(parentTransform, localTransform);
    }
}

// ==================================================
// CLASSE ROBOT ARM (BRAÇO)
// ==================================================

class RobotArm extends SceneObject {

    constructor(side) {
        super(
            robotArmVertices(),
            new Float32Array([0.2, 0.4, 0.8]) // Azul
        );

        this.side = side; // -1 = esquerdo, 1 = direito
        this.angle = 0.0;
        this.baseAngle = 0.0;
    }

    update(time) {
        // Braços balançam em direções opostas
        this.angle = 0.4 * Math.sin(time * 2.0) * this.side;
    }

    updateModelTransform(parentTransform) {
        // Ombro fica na lateral do corpo
        const shoulderX = this.side * 0.22;
        const shoulderY = 0.3;

        // Rotação a partir do ombro
        const localTransform = m3.multiply(
            m3.translation(shoulderX, shoulderY),
            m3.rotation(this.angle)
        );

        // Ajustar para o braço "pendurar" do ombro
        const offsetTransform = m3.translation(0.0, -0.25);

        this.modelTransform = m3.multiply(
            parentTransform,
            m3.multiply(localTransform, offsetTransform)
        );
    }
}

// ==================================================
// CLASSE ROBOT LEG (PERNA)
// ==================================================

class RobotLeg extends SceneObject {

    constructor(side) {
        super(
            robotLegVertices(),
            new Float32Array([0.1, 0.2, 0.5]) // Azul escuro
        );

        this.side = side; // -1 = esquerdo, 1 = direito
        this.angle = 0.0;
    }

    update(time) {
        // Pernas balançam alternadamente
        this.angle = 0.3 * Math.sin(time * 1.5 + (this.side > 0 ? Math.PI : 0));
    }

    updateModelTransform(parentTransform) {
        // Quadril fica na parte inferior do corpo
        const hipX = this.side * 0.1;
        const hipY = -0.4;

        const localTransform = m3.multiply(
            m3.translation(hipX, hipY),
            m3.rotation(this.angle)
        );

        // Ajustar para a perna "descer" do quadril
        const offsetTransform = m3.translation(0.0, -0.15);

        this.modelTransform = m3.multiply(
            parentTransform,
            m3.multiply(localTransform, offsetTransform)
        );
    }
}

// ==================================================
// CLASSE ROBOT BODY (CORPO)
// ==================================================

class RobotBody extends SceneObject {

    constructor() {
        super(
            robotBodyVertices(),
            new Float32Array([0.3, 0.5, 0.9]) // Azul
        );
    }

    updateModelTransform(parentTransform) {
        this.modelTransform = m3.multiply(parentTransform, m3.identity());
    }
}

// ==================================================
// CLASSE ROBOT (ROBÔ COMPLETO)
// ==================================================

class Robot {

    constructor(tx, ty, color, speed) {

        this.tx = tx;
        this.ty = ty;
        this.speed = speed;
        this.baseColor = color;

        // Criar partes do robô
        this.body = new RobotBody();
        this.head = new RobotHead();
        this.antenna = new RobotAntenna();
        this.leftArm = new RobotArm(-1);
        this.rightArm = new RobotArm(1);
        this.leftLeg = new RobotLeg(-1);
        this.rightLeg = new RobotLeg(1);
    }

    move(time) {

        // Movimento horizontal (vai e volta)
        this.tx += this.speed;

        if (this.tx > 1.5 || this.tx < -1.5) {
            this.speed = -this.speed;
        }

        // Atualizar animações internas
        this.head.update();
        this.antenna.update();
        this.leftArm.update(time);
        this.rightArm.update(time);
        this.leftLeg.update(time);
        this.rightLeg.update(time);

        // Transformação global do robô
        const robotTransform = m3.translation(this.tx, this.ty);

        // Atualizar transformações hierárquicas
        this.body.updateModelTransform(robotTransform);
        this.head.updateModelTransform(robotTransform);
        this.antenna.updateModelTransform(this.head.modelTransform);
        this.leftArm.updateModelTransform(robotTransform);
        this.rightArm.updateModelTransform(robotTransform);
        this.leftLeg.updateModelTransform(robotTransform);
        this.rightLeg.updateModelTransform(robotTransform);
    }

    draw(renderer) {

        // Desenhar na ordem correta (de trás para frente)
        this.leftLeg.draw(renderer);
        this.rightLeg.draw(renderer);
        this.leftArm.draw(renderer);
        this.body.draw(renderer);
        this.rightArm.draw(renderer);
        this.head.draw(renderer);
        this.antenna.draw(renderer);
    }
}

// ==================================================
// CLASSE GROUND (CHÃO)
// ==================================================

class Ground extends SceneObject {

    constructor() {
        super(
            groundVertices(),
            new Float32Array([0.15, 0.15, 0.15]) // Cinza escuro
        );
    }

    updateModelTransform() {
        this.modelTransform = m3.identity();
    }

    draw(renderer) {
        renderer.draw(this);
    }
}

// ==================================================
// CLASSE SCENE
// ==================================================

class Scene {

    constructor(gl, program) {

        this.renderer = new Renderer(gl, program);

        // View transform: janela de clipping
        this.viewTransform = m3.setClippingWindow(-1.8, -1.0, 1.8, 1.0);
        this.renderer.defineViewTransform(this.viewTransform);

        // Chão
        this.ground = new Ground();

        // Robôs
        this.robots = [
            new Robot(-0.5, -0.3, new Float32Array([0.3, 0.5, 0.9]), 0.008),
            new Robot(0.0, 0.0, new Float32Array([0.9, 0.3, 0.3]), 0.006),
            new Robot(0.5, 0.3, new Float32Array([0.3, 0.9, 0.3]), 0.007)
        ];

        this.time = 0.0;
    }

    update() {

        this.time += 0.016; // ~60 FPS

        for (const robot of this.robots) {
            robot.move(this.time);
        }
    }

    draw() {

        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.useProgram(program);

        // Desenhar chão
        this.ground.draw(this.renderer);

        // Desenhar robôs
        for (const robot of this.robots) {
            robot.draw(this.renderer);
        }
    }

    execute() {

        this.update();
        this.draw();

        requestAnimationFrame(() => this.execute());
    }

    init() {
        requestAnimationFrame(() => this.execute());
    }
}

// ==================================================
// CONFIGURAÇÃO INICIAL DO WEBGL
// ==================================================

gl.clearColor(0.1, 0.1, 0.1, 1.0);

gl.viewport(0, 0, canvas.width, canvas.height);

// ==================================================
// CRIAR CENA
// ==================================================

const scene = new Scene(gl, program);

// ==================================================
// INICIAR ANIMAÇÃO
// ==================================================

scene.init();

