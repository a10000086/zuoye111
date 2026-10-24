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

    // 7种方块 - 已修正所有形状数组，旋转状态完整
    const PIECES = [
        // Z型
        { 
            shapes: [
                [[1,1,0],[0,1,1],[0,0,0]],
                [[0,0,1],[0,1,1],[0,1,0]]
            ], 
            color: '#e02020', 
            img: 'https://res.cloudinary.com/w24obzi2/image/upload/v1792656560/zz%E6%AD%A3.webp' 
        },
        // O型
        { 
            shapes: [[[1,1],[1,1]]], 
            color: '#f5d300', 
            img: 'https://res.cloudinary.com/w24obzi2/image/upload/v1792656560/%E6%96%B9%E5%9D%97.webp' 
        },
        // T型
        { 
            shapes: [
                [[0,1,0],[1,1,1],[0,0,0]],
                [[0,1,0],[0,1,1],[0,1,0]],
                [[0,0,0],[1,1,1],[0,1,0]],
                [[0,1,0],[1,1,0],[0,1,0]]
            ], 
            color: '#a800e8', 
            img: 'https://res.cloudinary.com/w24obzi2/image/upload/v1792656557/t%E5%9E%8B.webp' 
        },
        // J型
        { 
            shapes: [
                [[1,0,0],[1,1,1],[0,0,0]],
                [[0,1,1],[0,1,0],[0,1,0]],
                [[0,0,0],[1,1,1],[0,0,1]],
                [[0,1,0],[0,1,0],[1,1,0]]
            ], 
            color: '#0058e8', 
            img: 'https://res.cloudinary.com/w24obzi2/image/upload/v1792656557/%E5%B7%A6%E6%8B%90.webp' 
        },
        // I型 - 已修复：2个独立旋转状态，之前合并成一个导致旋转无效
        { 
            shapes: [
                [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
                [[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]]
            ], 
            color: '#00d8e0', 
            img: 'https://res.cloudinary.com/w24obzi2/image/upload/v1792656557/%E9%95%BF%E6%9D%A1.webp' 
        },
        // L型
        { 
            shapes: [
                [[0,0,1],[1,1,1],[0,0,0]],
                [[0,1,0],[0,1,0],[0,1,1]],
                [[0,0,0],[1,1,1],[1,0,0]],
                [[1,1,0],[0,1,0],[0,1,0]]
            ], 
            color: '#ed8400', 
            img: 'https://res.cloudinary.com/w24obzi2/image/upload/v1792656556/%E5%8F%B3%E6%8B%90.webp' 
        },
        // S型
        { 
            shapes: [
                [[0,1,1],[1,1,0],[0,0,0]],
                [[0,1,0],[0,1,1],[0,0,1]]
            ], 
            color: '#00c020', 
            img: 'https://res.cloudinary.com/w24obzi2/image/upload/v1792656556/zz%E5%8F%8D.webp' 
        }
    ];

    // 画布适配：正方形格子填满区域，方块不变形且贴边
    function resizeCanvas() {
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
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

    // 精确碰撞检测
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

    // 方块落地立即更新背景色
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

    // 双向旋转 + 墙踢修正，direction=1顺时针，-1逆时针
    function rotatePiece(direction = 1) {
        const totalRotations = PIECES[currentPiece.type].shapes.length;
        const newRotation = (currentPiece.rotation + direction + totalRotations) % totalRotations;
        const kicks = [0, -1, 1, -2, 2];
        for (let kick of kicks) {
            if (!checkCollision(currentPiece, kick, 0, newRotation)) {
                currentPiece.x += kick;
                currentPiece.rotation = newRotation;
                return true;
            }
        }
        return false;
    }

    function dropPiece() {
        if (!checkCollision(currentPiece, 0, 1)) {
            currentPiece.y++;
        } else {
            mergePiece();
            clearLines();
            updateBgColor();
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
        updateBgColor();
        spawnNewPiece();
        render();
    }

    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                if (grid[y][x]) {
                    drawCell(x * cellSize, y * cellSize, grid[y][x]);
                }
            }
        }
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
        if (dropTimer) clearInterval(dropTimer);
        score = 0;
        updateScore();
        createGrid();
        nextPiece = randomPiece();
        spawnNewPiece();
        document.body.style.backgroundColor = DEFAULT_BG;
        dropTimer = setInterval(dropPiece, dropSpeed);
        render();
    }

    // 键盘控制 - 已修复上键顺时针旋转
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
                rotatePiece(1);
                break;
            case ' ':
                hardDrop();
                break;
            case 'r':
            case 'R':
                resetGame();
                break;
        }
        render();
    });

    restartBtn.addEventListener('click', resetGame);
    window.addEventListener('resize', resizeCanvas);

    // ========== 页面加载后自动启动游戏，无需点击 ==========
    resizeCanvas();
    createGrid();
    nextPiece = randomPiece();
    spawnNewPiece();
    dropTimer = setInterval(dropPiece, dropSpeed);
    render();

    // ========== 摄像头手势控制（异步加载，失败不影响游戏） ==========
    const videoElement = document.getElementById('webcam');
    let lastHandX = null;
    let lastHandAngle = null;
    let lastMoveTime = 0;
    let lastRotateTime = 0;
    let lastFistTime = 0;

    const MOVE_COOLDOWN = 180;
    const ROTATE_COOLDOWN = 350;
    const FIST_COOLDOWN = 1500;
    const MOVE_THRESHOLD = 0.08;
    const ROTATE_THRESHOLD = 25;

    async function initGestureControl() {
        if (typeof Hands === 'undefined' || typeof Camera === 'undefined') {
            console.log("手势识别库加载失败，可使用键盘操作");
            return;
        }

        try {
            const hands = new Hands({
                locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`
            });

            hands.setOptions({
                maxNumHands: 1,
                modelComplexity: 1,
                minDetectionConfidence: 0.7,
                minTrackingConfidence: 0.5
            });

            hands.onResults(handleHandGesture);

            const camera = new Camera(videoElement, {
                onFrame: async () => { await hands.send({ image: videoElement }); },
                width: 640,
                height: 480
            });
            await camera.start();
        } catch (e) {
            console.log("摄像头启动失败：", e.message);
        }
    }

    function handleHandGesture(results) {
        if (!results.multiHandLandmarks?.length) {
            lastHandX = null;
            lastHandAngle = null;
            return;
        }

        // 只识别右手
        const handIdx = results.multiHandedness.findIndex(h => h.label === 'Right');
        if (handIdx === -1) return;
        const landmarks = results.multiHandLandmarks[handIdx];
        const now = Date.now();

        const wrist = landmarks[0];
        const middleMcp = landmarks[9];
        const centerX = (wrist.x + middleMcp.x) / 2;

        // 左右移动（镜像适配：你的左边=画面右边）
        if (lastHandX !== null && now - lastMoveTime > MOVE_COOLDOWN) {
            const delta = centerX - lastHandX;
            if (delta > MOVE_THRESHOLD) {
                if (!checkCollision(currentPiece, -1, 0)) currentPiece.x--;
                lastMoveTime = now;
                render();
            } else if (delta < -MOVE_THRESHOLD) {
                if (!checkCollision(currentPiece, 1, 0)) currentPiece.x++;
                lastMoveTime = now;
                render();
            }
        }
        lastHandX = centerX;

        // 旋转控制
        const indexMcp = landmarks[5];
        const pinkyMcp = landmarks[17];
        const angle = Math.atan2(pinkyMcp.y - indexMcp.y, pinkyMcp.x - indexMcp.x) * 180 / Math.PI;

        if (lastHandAngle !== null && now - lastRotateTime > ROTATE_COOLDOWN) {
            let deltaAngle = angle - lastHandAngle;
            if (deltaAngle > 180) deltaAngle -= 360;
            if (deltaAngle < -180) deltaAngle += 360;

            if (deltaAngle > ROTATE_THRESHOLD) {
                rotatePiece(-1);
                lastRotateTime = now;
                lastHandAngle = angle;
                render();
            } else if (deltaAngle < -ROTATE_THRESHOLD) {
                rotatePiece(1);
                lastRotateTime = now;
                lastHandAngle = angle;
                render();
            }
        } else {
            lastHandAngle = angle;
        }

        // 握拳重置
        if (checkIsFist(landmarks) && now - lastFistTime > FIST_COOLDOWN) {
            resetGame();
            lastFistTime = now;
        }
    }

    function checkIsFist(landmarks) {
        const tips = [8, 12, 16, 20];
        const pips = [6, 10, 14, 18];
        let folded = 0;
        for (let i = 0; i < 4; i++) {
            if (landmarks[tips[i]].y > landmarks[pips[i]].y) folded++;
        }
        return folded >= 3;
    }

    // 启动手势识别
    initGestureControl();
});
