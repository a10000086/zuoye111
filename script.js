document.addEventListener('DOMContentLoaded', () => {
    // ========== 音量控制 ==========
    const soundBtn = document.querySelector('.sound-btn');
    const soundIcon = document.getElementById('soundIcon');
    const gameAudio = document.getElementById('gameAudio');

    const soundIconList = [
        'https://res.cloudinary.com/w24obzi2/image/upload/v1792656560/%E9%9D%99%E9%9F%B3.webp',
        'https://res.cloudinary.com/w24obzi2/image/upload/v1792656560/%E5%A3%B0%E9%9F%B3%E5%B0%8F.webp',
        'https://res.cloudinary.com/w24obzi2/image/upload/v1792656560/%E5%A3%B0%E9%9F%B3%E4%B8%AD.webp',
        'https://res.cloudinary.com/w24obzi2/image/upload/v1792656560/%E5%A3%B0%E9%9F%B3%E5%A4%A7.webp'
    ];
    const volumeLevel = [0, 0.3, 0.6, 1];
    let volumeIndex = 0;
    gameAudio.volume = volumeLevel[volumeIndex];

    soundBtn.addEventListener('click', () => {
        volumeIndex = (volumeIndex + 1) % soundIconList.length;
        soundIcon.src = soundIconList[volumeIndex];
        gameAudio.volume = volumeLevel[volumeIndex];
        if (volumeIndex > 0 && gameAudio.paused) {
            gameAudio.play().catch(() => {});
        }
    });

    // ========== 俄罗斯方块核心 ==========
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const nextBlockImg = document.getElementById('nextBlockImg');
    const scoreNum = document.getElementById('scoreNum');
    const restartBtn = document.getElementById('restartBtn');

    const COLS = 10;
    const ROWS = 20;
    const DEFAULT_BG = '#e84028';
    let cellSize;
    let grid = [];
    let currentPiece;
    let nextPiece;
    let score = 0;
    let dropTimer = null;
    const dropSpeed = 700;

    // 7种方块
    const PIECES = [
        { shapes: [[[1,1,0],[0,1,1],[0,0,0]], [[0,0,1],[0,1,1],[0,1,0]]], color: '#e02020', img: 'https://res.cloudinary.com/w24obzi2/image/upload/v1792656560/zz%E6%AD%A3.webp' },
        { shapes: [[[1,1],[1,1]]], color: '#f5d300', img: 'https://res.cloudinary.com/w24obzi2/image/upload/v1792656560/%E6%96%B9%E5%9D%97.webp' },
        { shapes: [[[0,1,0],[1,1,1],[0,0,0]], [[0,1,0],[0,1,1],[0,1,0]], [[0,0,0],[1,1,1],[0,1,0]], [[0,1,0],[1,1,0],[0,1,0]]], color: '#a800e8', img: 'https://res.cloudinary.com/w24obzi2/image/upload/v1792656557/t%E5%9E%8B.webp' },
        { shapes: [[[1,0,0],[1,1,1],[0,0,0]], [[0,1,1],[0,1,0],[0,1,0]], [[0,0,0],[1,1,1],[0,0,1]], [[0,1,0],[0,1,0],[1,1,0]]], color: '#0058e8', img: 'https://res.cloudinary.com/w24obzi2/image/upload/v1792656557/%E5%B7%A6%E6%8B%90.webp' },
        { shapes: [[[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], [[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]]], color: '#00d8e0', img: 'https://res.cloudinary.com/w24obzi2/image/upload/v1792656557/%E9%95%BF%E6%9D%A1.webp' },
        { shapes: [[[0,0,1],[1,1,1],[0,0,0]], [[0,1,0],[0,1,0],[0,1,1]], [[0,0,0],[1,1,1],[1,0,0]], [[1,1,0],[0,1,0],[0,1,0]]], color: '#ed8400', img: 'https://res.cloudinary.com/w24obzi2/image/upload/v1792656556/%E5%8F%B3%E6%8B%90.webp' },
        { shapes: [[[0,1,1],[1,1,0],[0,0,0]], [[0,1,0],[0,1,1],[0,0,1]]], color: '#00c020', img: 'https://res.cloudinary.com/w24obzi2/image/upload/v1792656556/zz%E5%8F%8D.webp' }
    ];

    // 画布适配：正方形格子 完全填满白色区域，零偏移贴边
    function resizeCanvas() {
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        // 宽高比1:2，按宽度算格子大小=按高度算，保证正方形
        cellSize = canvas.width / COLS;
        render();
    }

    function createGrid() {
        grid = Array(ROWS).fill(null).map(() => Array(COLS).fill(null));
    }

    function randomPiece() {
        const type = Math.floor(Math.random() * PIECES.length);
        return {
            type: type,
            rotation: 0,
            x: Math.floor(COLS / 2) - Math.floor(PIECES[type].shapes[0][0].length / 2),
            y: 0
        };
    }

    // 精确碰撞检测：只判断有实体的格子
    function checkCollision(piece, offsetX = 0, offsetY = 0, newRotation = null) {
        const rot = newRotation !== null ? newRotation : piece.rotation;
        const shape = PIECES[piece.type].shapes[rot];
        for (let y = 0; y < shape.length; y++) {
            for (let x = 0; x < shape[y].length; x++) {
                if (shape[y][x]) {
                    const newX = piece.x + x + offsetX;
                    const newY = piece.y + y + offsetY;
                    if (newX < 0 || newX >= COLS || newY >= ROWS) return true;
                    if (newY >= 0 && grid[newY][newX]) return true;
                }
            }
        }
        return false;
    }

    function mergePiece() {
        const shape = PIECES[currentPiece.type].shapes[currentPiece.rotation];
        const color = PIECES[currentPiece.type].color;
        for (let y = 0; y < shape.length; y++) {
            for (let x = 0; x < shape[y].length; x++) {
                if (shape[y][x]) {
                    const gridY = currentPiece.y + y;
                    const gridX = currentPiece.x + x;
                    if (gridY >= 0) grid[gridY][gridX] = color;
                }
            }
        }
    }

    function clearLines() {
        let linesCleared = 0;
        for (let y = ROWS - 1; y >= 0; y--) {
            if (grid[y].every(cell => cell !== null)) {
                grid.splice(y, 1);
                grid.unshift(Array(COLS).fill(null));
                linesCleared++;
                y++;
            }
        }
        if (linesCleared > 0) {
            score += linesCleared * 100 * linesCleared;
            updateScore();
        }
    }

    function updateScore() {
        scoreNum.textContent = score.toString().padStart(4, '0');
    }

    // 方块落地后立即统计颜色，切换背景
    function updateBgColor() {
        const colorCount = {};
        let maxColor = null;
        let maxCount = 0;
        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                const color = grid[y][x];
                if (color) {
                    colorCount[color] = (colorCount[color] || 0) + 1;
                    if (colorCount[color] > maxCount) {
                        maxCount = colorCount[color];
                        maxColor = color;
                    }
                }
            }
        }
        document.body.style.backgroundColor = maxColor || DEFAULT_BG;
    }

    function spawnNewPiece() {
        currentPiece = nextPiece;
        nextPiece = randomPiece();
        nextBlockImg.src = PIECES[nextPiece.type].img;

        if (checkCollision(currentPiece)) {
            clearInterval(dropTimer);
            alert('游戏结束！得分：' + score);
            resetGame();
        }
    }

    // 旋转带墙踢，贴边也能正常旋转
    function rotatePiece() {
        const newRotation = (currentPiece.rotation + 1) % PIECES[currentPiece.type].shapes.length;
        const kicks = [0, -1, 1, -2, 2];
        for (let kick of kicks) {
            if (!checkCollision(currentPiece, kick, 0, newRotation)) {
                currentPiece.x += kick;
                currentPiece.rotation = newRotation;
                return;
            }
        }
    }

    function dropPiece() {
        if (!checkCollision(currentPiece, 0, 1)) {
            currentPiece.y++;
        } else {
            mergePiece();
            clearLines();
            updateBgColor(); // 落地立即更新背景
            spawnNewPiece();
        }
        render();
    }

    function hardDrop() {
        while (!checkCollision(currentPiece, 0, 1)) {
            currentPiece.y++;
        }
        mergePiece();
        clearLines();
        updateBgColor(); // 快速落地立即更新背景
        spawnNewPiece();
        render();
    }

    // 渲染：格子从(0,0)开始绘制，完全贴边
    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // 绘制已固定方块
        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                if (grid[y][x]) {
                    drawCell(x * cellSize, y * cellSize, grid[y][x]);
                }
            }
        }
        // 绘制当前下落方块
        const shape = PIECES[currentPiece.type].shapes[currentPiece.rotation];
        const color = PIECES[currentPiece.type].color;
        for (let y = 0; y < shape.length; y++) {
            for (let x = 0; x < shape[y].length; x++) {
                if (shape[y][x]) {
                    const drawX = (currentPiece.x + x) * cellSize;
                    const drawY = (currentPiece.y + y) * cellSize;
                    if (currentPiece.y + y >= 0) {
                        drawCell(drawX, drawY, color);
                    }
                }
            }
        }
    }

    function drawCell(x, y, color) {
        ctx.fillStyle = color;
        ctx.fillRect(x, y, cellSize - 1, cellSize - 1);
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, cellSize - 1, cellSize - 1);
    }

    function resetGame() {
        clearInterval(dropTimer);
        score = 0;
        updateScore();
        createGrid();
        nextPiece = randomPiece();
        spawnNewPiece();
        document.body.style.backgroundColor = DEFAULT_BG;
        dropTimer = setInterval(dropPiece, dropSpeed);
        render();
    }

    // 键盘控制
    document.addEventListener('keydown', (e) => {
        switch(e.key) {
            case 'ArrowLeft':
                if (!checkCollision(currentPiece, -1, 0)) currentPiece.x--;
                break;
            case 'ArrowRight':
                if (!checkCollision(currentPiece, 1, 0)) currentPiece.x++;
                break;
            case 'ArrowDown':
                dropPiece();
                break;
            case 'ArrowUp':
                rotatePiece();
                break;
            case ' ':
                hardDrop();
                break;
        }
        render();
    });

    restartBtn.addEventListener('click', resetGame);
    window.addEventListener('resize', resizeCanvas);

    // 启动游戏
    resizeCanvas();
    createGrid();
    nextPiece = randomPiece();
    spawnNewPiece();
    dropTimer = setInterval(dropPiece, dropSpeed);
});
