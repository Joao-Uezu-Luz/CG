const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

// Dimensões do canvas
const WIDTH = canvas.width;
const HEIGHT = canvas.height;

const colors = {
    '0': { name: 'Azul', r: 0, g: 0.4, b: 1.0 },
    '1': { name: 'Vermelho', r: 1.0, g: 0.1, b: 0.1 },
    '2': { name: 'Verde', r: 0.1, g: 0.9, b: 0.1 },
    '3': { name: 'Amarelo', r: 1.0, g: 0.9, b: 0.0 },
    '4': { name: 'Roxo', r: 0.7, g: 0.0, b: 0.8 },
    '5': { name: 'Ciano', r: 0.0, g: 0.8, b: 0.9 },
    '6': { name: 'Rosa', r: 1.0, g: 0.2, b: 0.6 },
    '7': { name: 'Laranja', r: 1.0, g: 0.5, b: 0.0 },
    '8': { name: 'Branco', r: 1.0, g: 1.0, b: 1.0 },
    '9': { name: 'Cinza', r: 0.5, g: 0.5, b: 0.5 }
};

// Cor atual (inicia com Azul - tecla 0)
let currentColor = colors['0'];
let currentKey = '0';

let points = [];
let linePoints = [];
let isDrawing = false;

function bresenhamLine(x0, y0, x1, y1) {
    const points = [];
    
    // Garantir que estão dentro dos limites
    x0 = Math.round(Math.max(0, Math.min(WIDTH - 1, x0)));
    y0 = Math.round(Math.max(0, Math.min(HEIGHT - 1, y0)));
    x1 = Math.round(Math.max(0, Math.min(WIDTH - 1, x1)));
    y1 = Math.round(Math.max(0, Math.min(HEIGHT - 1, y1)));
    
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    
    const stepX = (x1 > x0) ? 1 : -1;
    const stepY = (y1 > y0) ? 1 : -1;
    
    let x = x0;
    let y = y0;
    
    // Caso 1: Linha mais horizontal que vertical
    if (dx > dy) {
        let D = 2 * dy - dx;
        const incE = 2 * dy;
        const incNE = 2 * (dy - dx);
        
        for (let i = 0; i <= dx; i++) {
            points.push({ x, y });
            
            if (D <= 0) {
                D += incE;
                x += stepX;
            } else {
                D += incNE;
                x += stepX;
                y += stepY;
            }
        }
    }
    // Caso 2: Linha mais vertical que horizontal
    else {
        let D = 2 * dx - dy;
        const incE = 2 * dx;
        const incNE = 2 * (dx - dy);
        
        for (let i = 0; i <= dy; i++) {
            points.push({ x, y });
            
            if (D <= 0) {
                D += incE;
                y += stepY;
            } else {
                D += incNE;
                x += stepX;
                y += stepY;
            }
        }
    }
    
    return points;
}

function drawLine(points, color) {
    if (!points || points.length < 2) return;
    
    const r = Math.round(color.r * 255);
    const g = Math.round(color.g * 255);
    const b = Math.round(color.b * 255);
    
    const imageData = ctx.getImageData(0, 0, WIDTH, HEIGHT);
    const data = imageData.data;
    
    // Desenhar cada pixel da linha
    for (let i = 0; i < points.length; i++) {
        const px = points[i].x;
        const py = points[i].y;
        
        // Verificar limites
        if (px < 0 || px >= WIDTH || py < 0 || py >= HEIGHT) continue;
        
        const index = (py * WIDTH + px) * 4;
        data[index] = r;
        data[index + 1] = g;
        data[index + 2] = b;
        data[index + 3] = 255;
    }
    
    ctx.putImageData(imageData, 0, 0);
}

function clearCanvas() {
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

function redraw() {
    clearCanvas();
    
    if (linePoints.length > 0) {
        drawLine(linePoints, currentColor);
    }
}

function updateLine() {
    if (points.length === 2) {
        // Gerar pontos da linha usando Bresenham
        linePoints = bresenhamLine(
            points[0].x, points[0].y,
            points[1].x, points[1].y
        );
        
        // Redesenhar
        redraw();
        
        // Atualizar informações das coordenadas
        updateCoordinates();
    }
}

function updateCoordinates() {
    if (points.length === 2) {
        // Coordenadas do canvas (pixels)
        document.getElementById('canvasCoordinates').textContent = 
            `Canvas: (${points[0].x}, ${points[0].y}) → (${points[1].x}, ${points[1].y})`;
        
        // Converter para coordenadas WebGL (NDC - Normalized Device Coordinates)
        const webglX0 = (points[0].x / WIDTH) * 2 - 1;
        const webglY0 = -((points[0].y / HEIGHT) * 2 - 1);
        const webglX1 = (points[1].x / WIDTH) * 2 - 1;
        const webglY1 = -((points[1].y / HEIGHT) * 2 - 1);
        
        document.getElementById('webglCoordinates').textContent = 
            `WebGL: (${webglX0.toFixed(3)}, ${webglY0.toFixed(3)}) → (${webglX1.toFixed(3)}, ${webglY1.toFixed(3)})`;
    }
}

canvas.addEventListener('mousedown', function(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = Math.round((e.clientX - rect.left) * scaleX);
    const y = Math.round((e.clientY - rect.top) * scaleY);
    
    // Se já temos um ponto inicial, este é o final
    if (points.length === 0) {
        // Primeiro clique: ponto inicial
        points = [{ x, y }];
        isDrawing = true;
        
        // Atualizar informações
        document.getElementById('canvasCoordinates').textContent = 
            `Canvas: (${x}, ${y}) → ?`;
        
        // Converter para WebGL
        const webglX = (x / WIDTH) * 2 - 1;
        const webglY = -((y / HEIGHT) * 2 - 1);
        document.getElementById('webglCoordinates').textContent = 
            `WebGL: (${webglX.toFixed(3)}, ${webglY.toFixed(3)}) → ?`;
            
    } else if (points.length === 1) {
        // Segundo clique: ponto final
        points.push({ x, y });
        isDrawing = false;
        updateLine();
    } else {
        // Reiniciar com novo ponto
        points = [{ x, y }];
        linePoints = [];
        redraw();
        isDrawing = true;
        
        document.getElementById('canvasCoordinates').textContent = 
            `Canvas: (${x}, ${y}) → ?`;
        
        const webglX = (x / WIDTH) * 2 - 1;
        const webglY = -((y / HEIGHT) * 2 - 1);
        document.getElementById('webglCoordinates').textContent = 
            `WebGL: (${webglX.toFixed(3)}, ${webglY.toFixed(3)}) → ?`;
    }
});

document.addEventListener('keydown', function(e) {
    const key = e.key;
    
    // Verificar se é uma tecla de 0 a 9
    if (key >= '0' && key <= '9') {
        e.preventDefault();
        
        // Mudar cor
        currentKey = key;
        currentColor = colors[key];
        
        // Redesenhar a linha com a nova cor
        if (linePoints.length > 0) {
            redraw();
        }
    }
});

function init() {
    // Limpar tela
    clearCanvas();
    
    // Linha inicial: (0,0) a (0,0) - não visível
    points = [{ x: 0, y: 0 }, { x: 0, y: 0 }];
    linePoints = bresenhamLine(0, 0, 0, 0);
    
    // Desenhar linha inicial (azul - tecla 0)
    drawLine(linePoints, colors['0']);
    
    // Atualizar informações
    document.getElementById('canvasCoordinates').textContent = 
        'Canvas: (0, 0) → (0, 0)';
    document.getElementById('webglCoordinates').textContent = 
        'WebGL: (-1.000, 1.000) → (-1.000, 1.000)';
}

// Iniciar
init();

console.log(' Programa Bresenham iniciado!');
console.log(' Clique para definir os pontos da linha');
console.log(' Teclas 0-9 para mudar a cor');
console.log(' Coordenadas atualizadas em tempo real');
