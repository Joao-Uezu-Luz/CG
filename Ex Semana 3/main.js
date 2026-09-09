const canvas = document.getElementById("canvas");
const gl = canvas.getContext("webgl2");

if (!gl) {
    throw new Error("WebGL 2 não é suportado.");
}

// --------------------------------------------------
// ELEMENTOS HTML
// --------------------------------------------------
const placarElement = document.getElementById('placar');
const mensagemElement = document.getElementById('mensagem');

// --------------------------------------------------
// CONSTANTES DO JOGO
// --------------------------------------------------
const BARRA_LARGURA = 0.04;
const BARRA_ALTURA = 0.3;
const RAIO_BOLA = 0.025;
const VELOCIDADE_INICIAL = 0.005;
const VELOCIDADE_MAXIMA = 0.02;
const AUMENTO_VELOCIDADE = 1.02;

// --------------------------------------------------
// ESTADO DO JOGO
// --------------------------------------------------
const ESTADO = {
    MENU: 0,
    JOGANDO: 1,
    GAME_OVER: 2,
    PONTO: 3
};

let estado = ESTADO.MENU;
let placarEsquerda = 0;
let placarDireita = 0;
let pontosParaVencer = 5;

// --------------------------------------------------
// POSIÇÕES DOS OBJETOS
// --------------------------------------------------
let tyBE = 0.0;  // Barra Esquerda Y
let tyBD = 0.0;  // Barra Direita Y
let txBola = 0.0;
let tyBola = 0.0;
let txBola_offset = VELOCIDADE_INICIAL;
let tyBola_offset = VELOCIDADE_INICIAL;

// --------------------------------------------------
// TECLAS
// --------------------------------------------------
const teclas = {};

document.addEventListener('keydown', (event) => {
    teclas[event.key] = true;
    
    // Iniciar jogo com ESPAÇO
    if (event.key === ' ' && (estado === ESTADO.MENU || estado === ESTADO.GAME_OVER)) {
        reiniciarJogo();
    }
    
    // Reiniciar com R
    if (event.key === 'r' || event.key === 'R') {
        reiniciarCompleto();
    }
});

document.addEventListener('keyup', (event) => {
    teclas[event.key] = false;
});

// --------------------------------------------------
// VÉRTICES
// --------------------------------------------------
function verticesBarra() {
    const w = BARRA_LARGURA / 2;
    const h = BARRA_ALTURA / 2;
    return new Float32Array([
        -w,  h,
        -w, -h,
         w,  h,
         w,  h,
        -w, -h,
         w, -h
    ]);
}

function verticesBola() {
    let vertices = [];
    let numSegments = 30;
    let radius = RAIO_BOLA;

    for (let i = 0; i < numSegments; i++) {
        let theta1 = (i / numSegments) * 2 * Math.PI;
        let theta2 = ((i + 1) / numSegments) * 2 * Math.PI;

        vertices.push(0, 0);
        vertices.push(radius * Math.cos(theta1), radius * Math.sin(theta1));
        vertices.push(radius * Math.cos(theta2), radius * Math.sin(theta2));
    }

    return new Float32Array(vertices);
}

// --------------------------------------------------
// DADOS DOS OBJETOS
// --------------------------------------------------
const verticesBarraEsquerda = verticesBarra();
const verticesBarraDireita = verticesBarra();
const verticesBolaCentro = verticesBola();

const corBarraEsquerda = new Float32Array([0.0, 1.0, 0.0]);
const corBarraDireita = new Float32Array([0.0, 0.0, 1.0]);
const corBolaCentro = new Float32Array([1.0, 1.0, 1.0]);

// --------------------------------------------------
// MATRIZES DE TRANSFORMAÇÃO
// --------------------------------------------------
let MbarraEsquerda = m3.translation(-0.9, tyBE);
let MbarraDireita = m3.translation(0.9, tyBD);
let MbolaCentro = m3.identity();

// --------------------------------------------------
// BUFFER
// --------------------------------------------------
const verticesBuffer = gl.createBuffer();

// --------------------------------------------------
// SHADERS (mantidos iguais)
// --------------------------------------------------
const vertexShaderSource = `#version 300 es

in vec2 aPosition;
uniform mat3 u_transform;

void main() {
    vec3 position = u_transform * vec3(aPosition, 1.0);
    gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const fragmentShaderSource = `#version 300 es

precision mediump float;
uniform vec3 uColor;
out vec4 outColor;

void main() {
    outColor = vec4(uColor, 1.0);
}
`;

// --------------------------------------------------
// FUNÇÕES AUXILIARES DE SHADER
// --------------------------------------------------
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

// --------------------------------------------------
// PROGRAMA
// --------------------------------------------------
const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);

if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program));
}

const positionLocation = gl.getAttribLocation(program, "aPosition");
const colorLocation = gl.getUniformLocation(program, "uColor");
const transformLocation = gl.getUniformLocation(program, "u_transform");

// --------------------------------------------------
// FUNÇÕES DE DESENHO
// --------------------------------------------------
function desenharObjeto(vertices, cor, matriz) {
    gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    
    gl.uniform3fv(colorLocation, cor);
    gl.uniformMatrix3fv(transformLocation, false, matriz);
    
    gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 2);
}

function desenharCena() {
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    
    desenharObjeto(verticesBarraEsquerda, corBarraEsquerda, MbarraEsquerda);
    desenharObjeto(verticesBarraDireita, corBarraDireita, MbarraDireita);
    desenharObjeto(verticesBolaCentro, corBolaCentro, MbolaCentro);
}

// --------------------------------------------------
// FUNÇÕES DE JOGO
// --------------------------------------------------
function resetarBola() {
    txBola = 0.0;
    tyBola = 0.0;
    
    // Direção aleatória
    const angulo = (Math.random() - 0.5) * Math.PI / 3;
    const velocidade = VELOCIDADE_INICIAL;
    txBola_offset = velocidade * Math.cos(angulo) * (Math.random() > 0.5 ? 1 : -1);
    tyBola_offset = velocidade * Math.sin(angulo);
}

function marcarPonto(jogador) {
    if (jogador === 'esquerda') {
        placarEsquerda++;
    } else {
        placarDireita++;
    }
    
    atualizarPlacar();
    
    if (placarEsquerda >= pontosParaVencer || placarDireita >= pontosParaVencer) {
        estado = ESTADO.GAME_OVER;
        mostrarMensagem(
            `🏆 ${placarEsquerda > placarDireita ? 'Jogador 1' : 'Jogador 2'} Venceu!`,
            'Pressione ESPAÇO para jogar novamente'
        );
    } else {
        estado = ESTADO.PONTO;
        mostrarMensagem('Ponto!', 'Pressione ESPAÇO para continuar');
        resetarBola();
        
        // Esperar input para continuar
        const handler = (e) => {
            if (e.key === ' ') {
                estado = ESTADO.JOGANDO;
                esconderMensagem();
                document.removeEventListener('keydown', handler);
            }
        };
        document.addEventListener('keydown', handler);
    }
}

function reiniciarJogo() {
    placarEsquerda = 0;
    placarDireita = 0;
    tyBE = 0.0;
    tyBD = 0.0;
    atualizarPlacar();
    resetarBola();
    estado = ESTADO.JOGANDO;
    esconderMensagem();
}

function reiniciarCompleto() {
    placarEsquerda = 0;
    placarDireita = 0;
    tyBE = 0.0;
    tyBD = 0.0;
    atualizarPlacar();
    resetarBola();
    estado = ESTADO.MENU;
    mostrarMensagem('PONG', 'Pressione ESPAÇO para começar');
}

function atualizarPlacar() {
    placarElement.textContent = `${placarEsquerda} - ${placarDireita}`;
}

function mostrarMensagem(titulo, subtitulo) {
    mensagemElement.innerHTML = `${titulo}<div class="sub">${subtitulo}</div>`;
    mensagemElement.style.display = 'block';
}

function esconderMensagem() {
    mensagemElement.style.display = 'none';
}

// --------------------------------------------------
// LÓGICA DE COLISÃO
// --------------------------------------------------
function verificarColisaoBolaBarra() {
    // Colisão com barra esquerda
    if (txBola - RAIO_BOLA <= -0.9 + BARRA_LARGURA) {
        if (tyBola >= tyBE - BARRA_ALTURA/2 && tyBola <= tyBE + BARRA_ALTURA/2) {
            // Colisão - inverter direção X
            txBola_offset = -txBola_offset;
            
            // Aumentar velocidade
            if (Math.abs(txBola_offset) < VELOCIDADE_MAXIMA) {
                txBola_offset *= AUMENTO_VELOCIDADE;
                tyBola_offset *= AUMENTO_VELOCIDADE;
            }
            
            // Adicionar efeito de ângulo baseado na posição de impacto
            const impacto = (tyBola - tyBE) / (BARRA_ALTURA/2);
            tyBola_offset += impacto * 0.003;
            
            // Garantir que a bola não fique presa
            txBola = -0.9 + BARRA_LARGURA + RAIO_BOLA + 0.001;
            
            // Efeito sonoro (se disponível)
            // playBeep(440, 50);
            return true;
        }
    }
    
    // Colisão com barra direita
    if (txBola + RAIO_BOLA >= 0.9 - BARRA_LARGURA) {
        if (tyBola >= tyBD - BARRA_ALTURA/2 && tyBola <= tyBD + BARRA_ALTURA/2) {
            txBola_offset = -txBola_offset;
            
            if (Math.abs(txBola_offset) < VELOCIDADE_MAXIMA) {
                txBola_offset *= AUMENTO_VELOCIDADE;
                tyBola_offset *= AUMENTO_VELOCIDADE;
            }
            
            const impacto = (tyBola - tyBD) / (BARRA_ALTURA/2);
            tyBola_offset += impacto * 0.003;
            
            txBola = 0.9 - BARRA_LARGURA - RAIO_BOLA - 0.001;
            return true;
        }
    }
    
    return false;
}

// --------------------------------------------------
// ANIMAÇÃO
// --------------------------------------------------
function atualizarAnimacao() {
    if (estado !== ESTADO.JOGANDO) return;
    
    // Movimento da barra esquerda (Jogador 1)
    if (teclas['w'] || teclas['W']) {
        tyBE += 0.04;
        if (tyBE > 0.85) tyBE = 0.85;
    }
    if (teclas['s'] || teclas['S']) {
        tyBE -= 0.04;
        if (tyBE < -0.85) tyBE = -0.85;
    }
    
    // Movimento da barra direita (Jogador 2)
    if (teclas['ArrowUp']) {
        tyBD += 0.04;
        if (tyBD > 0.85) tyBD = 0.85;
    }
    if (teclas['ArrowDown']) {
        tyBD -= 0.04;
        if (tyBD < -0.85) tyBD = -0.85;
    }
    
    // Atualizar matrizes das barras
    MbarraEsquerda = m3.translation(-0.9, tyBE);
    MbarraDireita = m3.translation(0.9, tyBD);
    
    // Movimento da bola
    txBola += txBola_offset;
    tyBola += tyBola_offset;
    
    // Colisão com barras
    verificarColisaoBolaBarra();
    
    // Colisão com paredes superior/inferior
    if (tyBola + RAIO_BOLA > 0.98) {
        tyBola_offset = -tyBola_offset;
        tyBola = 0.98 - RAIO_BOLA;
    }
    if (tyBola - RAIO_BOLA < -0.98) {
        tyBola_offset = -tyBola_offset;
        tyBola = -0.98 + RAIO_BOLA;
    }
    
    // Marcar pontos
    if (txBola < -1.0) {
        marcarPonto('direita');
    } else if (txBola > 1.0) {
        marcarPonto('esquerda');
    }
    
    // Atualizar matriz da bola
    MbolaCentro = m3.translation(txBola, tyBola);
}

// --------------------------------------------------
// LOOP PRINCIPAL
// --------------------------------------------------
function loop() {
    atualizarAnimacao();
    desenharCena();
    requestAnimationFrame(loop);
}

// --------------------------------------------------
// INICIALIZAÇÃO
// --------------------------------------------------
function iniciar() {
    gl.clearColor(0.05, 0.05, 0.05, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    // Estado inicial
    estado = ESTADO.MENU;
    mostrarMensagem('PONG', 'Pressione ESPAÇO para começar');
    atualizarPlacar();
    resetarBola();
    
    // Iniciar loop
    loop();
}

// --------------------------------------------------
// EFEITOS SONOROS (opcional)
// --------------------------------------------------
// Descomente se quiser áudio
/*
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playBeep(frequency = 440, duration = 100) {
    try {
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        oscillator.frequency.value = frequency;
        gainNode.gain.value = 0.3;
        
        oscillator.start();
        setTimeout(() => {
            oscillator.stop();
        }, duration);
    } catch(e) {
        // Ignorar erros de áudio
    }
}
*/

// --------------------------------------------------
// INICIAR
// --------------------------------------------------
iniciar();