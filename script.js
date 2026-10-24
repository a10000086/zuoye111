document.addEventListener('DOMContentLoaded', () => {
    // ========== 音量控制 ==========
    const soundBtn = document.querySelector('.sound-btn');
    const soundIcon = document.getElementById('soundIcon');

    const soundIconList = [
        'https://res.cloudinary.com/w24obzi2/image/upload/v1792656560/%E9%9D%99%E9%9F%B3.webp',
        'https://res.cloudinary.com/w24obzi2/image/upload/v1792656560/%E5%A3%B0%E9%9F%B3%E5%B0%8F.webp',
        'https://res.cloudinary.com/w24obzi2/image/upload/v1792656560/%E5%A3%B0%E9%9F%B3%E4%B8%AD.webp',
        'https://res.cloudinary.com/w24obzi2/image/upload/v1792656560/%E5%A3%B0%E9%9F%B3%E5%A4%A7.webp'
    ];
    const volumeLevel = [0, 0.3, 0.6, 1];
    let volumeIndex = 1;
    let audioContext = null;
    let masterGain = null;
    soundIcon.src = soundIconList[volumeIndex];

    function initializeAudio() {
        if (audioContext) return true;

        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) {
            console.error('当前浏览器不支持 Web Audio，无法播放游戏音效');
            return false;
        }

        audioContext = new AudioContextClass();
        masterGain = audioContext.createGain();
        masterGain.gain.value = volumeLevel[volumeIndex];
        masterGain.connect(audioContext.destination);
        return true;
    }

    function unlockAudio() {
        if (!initializeAudio()) return;
        if (audioContext.state === 'suspended') {
            audioContext.resume().catch(error => {
                console.error('无法启用游戏音效', error);
            });
        }
    }

    function playElectronicNotes(notes, waveform, noteDuration, gap, volume = 0.16) {
        if (volumeIndex === 0 || !initializeAudio() || audioContext.state !== 'running') return;

        const startTime = audioContext.currentTime;
        notes.forEach((frequency, index) => {
            const start = startTime + index * gap;
            const oscillator = audioContext.createOscillator();
            const envelope = audioContext.createGain();
            oscillator.type = waveform;
            oscillator.frequency.setValueAtTime(frequency, start);
            oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.94, start + noteDuration);
            envelope.gain.setValueAtTime(0.0001, start);
            envelope.gain.exponentialRampToValueAtTime(volume, start + 0.008);
            envelope.gain.exponentialRampToValueAtTime(0.0001, start + noteDuration);
            oscillator.connect(envelope);
            envelope.connect(masterGain);
            oscillator.start(start);
            oscillator.stop(start + noteDuration + 0.01);
        });
    }

    const pieceLockSounds = [
        { notes: [196, 294], waveform: 'square' },
        { notes: [330, 247], waveform: 'triangle' },
        { notes: [262, 392], waveform: 'square' },
        { notes: [220, 330], waveform: 'sawtooth' },
        { notes: [440, 330], waveform: 'triangle' },
        { notes: [294, 220], waveform: 'sawtooth' },
        { notes: [349, 262], waveform: 'square' }
    ];

    function playPieceLockSound(pieceType) {
        const sound = pieceLockSounds[pieceType];
        playElectronicNotes(sound.notes, sound.waveform, 0.11, 0.055);
    }

    function playLineClearSound(linesCleared) {
        const notes = [523, 659, 784, 1047].slice(0, Math.min(linesCleared + 2, 4));
        playElectronicNotes(notes, 'square', 0.15, 0.07, 0.13);
    }

    function playGameOverSound() {
        playElectronicNotes([392, 330, 262, 196], 'sawtooth', 0.18, 0.13, 0.15);
    }

    soundBtn.addEventListener('click', () => {
        volumeIndex = (volumeIndex + 1) % soundIconList.length;
        soundIcon.src = soundIconList[volumeIndex];
        if (initializeAudio()) {
            masterGain.gain.setTargetAtTime(volumeLevel[volumeIndex], audioContext.currentTime, 0.025);
            unlockAudio();
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
    let gameOver = false;
    let gameOverTimeout = null;
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
        playPieceLockSound(currentPiece.type);
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
            playLineClearSound(linesCleared);
        }
        return linesCleared;
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
            gameOver = true;
            playGameOverSound();
            gameOverTimeout = setTimeout(() => {
                if (!gameOver) return;
                gameOverTimeout = null;
                alert('游戏结束！得分：' + score);
                resetGame();
            }, 750);
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
        if (gameOver) return;
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
        if (gameOver) return;
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
        if (gameOverTimeout !== null) {
            clearTimeout(gameOverTimeout);
            gameOverTimeout = null;
        }
        gameOver = false;
        score = 0;
        updateScore();
        createGrid();
        nextPiece = randomPiece();
        spawnNewPiece();
        document.body.style.backgroundColor = DEFAULT_BG;
        dropTimer = setInterval(dropPiece, dropSpeed);
        render();
    }

    function handleGameAction(action) {
        unlockAudio();
        if (gameOver && action !== 'r' && action !== 'R') return;
        switch(action) {
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
    }

    // Keyboard and touch controls share the same action handler.
    document.addEventListener('keydown', (e) => {
        if (['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', ' '].includes(e.key)) {
            e.preventDefault();
        }
        handleGameAction(e.key);
    });

    restartBtn.addEventListener('click', () => handleGameAction('r'));
    document.querySelectorAll('.mobile-control-btn').forEach(button => {
        button.addEventListener('click', () => handleGameAction(button.dataset.gameAction));
    });
    window.addEventListener('resize', resizeCanvas);

    // ========== 页面加载后自动启动游戏，无需点击 ==========
    createGrid();
    nextPiece = randomPiece();
    spawnNewPiece();
    resizeCanvas();
    dropTimer = setInterval(dropPiece, dropSpeed);
    render();

    // ========== 摄像头手势控制（异步加载，失败不影响游戏） ==========
    const videoElement = document.getElementById('webcam');
    const gestureStatus = document.getElementById('gestureStatus');
    const cameraRetryBtn = document.getElementById('cameraRetryBtn');
    let cameraStream = null;
    let cameraFrameId = null;
    let hands = null;
    let cameraStarting = false;
    let moveAnchorX = null;
    let rotationAnchorAngle = null;
    let lastMoveTime = 0;
    let lastRotateTime = 0;
    let lastFistTime = 0;
    let wasFist = false;

    const MOVE_COOLDOWN = 180;
    const ROTATE_COOLDOWN = 350;
    const FIST_COOLDOWN = 1200;
    const MOVE_THRESHOLD = 0.1;
    const ROTATE_THRESHOLD = 20;

    function setGestureStatus(message) {
        if (gestureStatus.textContent !== message) {
            gestureStatus.textContent = message;
        }
    }

    function loadHandsLibrary() {
        if (typeof Hands !== 'undefined') return Promise.resolve();

        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/hands.min.js';
            script.onload = () => {
                if (typeof Hands === 'undefined') {
                    reject(new Error('MediaPipe Hands 加载后不可用'));
                    return;
                }
                resolve();
            };
            script.onerror = () => reject(new Error('无法加载手势识别库，请检查网络后重试'));
            document.head.appendChild(script);
        });
    }

    async function startCamera() {
        if (cameraStarting || cameraStream) return;
        cameraStarting = true;
        cameraRetryBtn.disabled = true;
        setGestureStatus('正在请求摄像头权限…');
        try {
            if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
                throw new Error('摄像头只能在 HTTPS 或 localhost 网页中使用，请勿直接双击打开 HTML 文件');
            }

            cameraStream = await navigator.mediaDevices.getUserMedia({
                audio: false,
                video: {
                    facingMode: { ideal: 'user' },
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                }
            });
            videoElement.srcObject = cameraStream;
            await videoElement.play();

            await loadHandsLibrary();

            hands = new Hands({
                locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`
            });
            hands.setOptions({
                maxNumHands: 1,
                modelComplexity: 1,
                minDetectionConfidence: 0.7,
                minTrackingConfidence: 0.5
            });
            hands.onResults(handleHandGesture);
            setGestureStatus('摄像头已连接，请将右手置于画面中');
            cameraFrameId = requestAnimationFrame(processCameraFrame);
        } catch (e) {
            const messages = {
                NotAllowedError: '摄像头权限被拒绝。请在浏览器地址栏的网站设置中将摄像头设为“允许”，再点重试',
                NotFoundError: '未找到摄像头，请检查设备连接',
                NotReadableError: '摄像头正被其他应用占用，请关闭其他应用后重试',
                SecurityError: '浏览器安全策略阻止摄像头访问，请通过 HTTPS 或 localhost 打开页面',
                OverconstrainedError: '摄像头不支持请求的分辨率，请检查设备后重试',
                AbortError: '摄像头启动中断，请重试'
            };
            stopCamera();
            setGestureStatus(messages[e.name] || `摄像头启动失败：${e.message || e.name || '未知错误'}`);
            console.error('摄像头启动失败', e);
        } finally {
            cameraStarting = false;
            cameraRetryBtn.disabled = false;
        }
    }

    function stopCamera() {
        if (cameraFrameId !== null) {
            cancelAnimationFrame(cameraFrameId);
            cameraFrameId = null;
        }
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            cameraStream = null;
        }
        videoElement.srcObject = null;
    }

    async function processCameraFrame() {
        if (!cameraStream || !hands) return;
        try {
            if (videoElement.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
                await hands.send({ image: videoElement });
            }
            if (cameraStream) {
                cameraFrameId = requestAnimationFrame(processCameraFrame);
            }
        } catch (e) {
            console.error('手势识别处理失败', e);
            stopCamera();
            setGestureStatus(`摄像头已连接，但手势识别失败：${e.message || '请检查网络后重试'}`);
        }
    }

    function handleHandGesture(results) {
        if (!results.multiHandLandmarks?.length) {
            moveAnchorX = null;
            rotationAnchorAngle = null;
            wasFist = false;
            setGestureStatus('摄像头已连接，请将右手置于画面中');
            return;
        }

        // MediaPipe assumes mirrored input; the unmirrored webcam stream labels the physical right hand as Left.
        const handIdx = results.multiHandedness?.findIndex(hand => hand.label === 'Left') ?? -1;
        if (handIdx === -1) {
            moveAnchorX = null;
            rotationAnchorAngle = null;
            wasFist = false;
            setGestureStatus('已检测到手，请使用右手操控');
            return;
        }
        const landmarks = results.multiHandLandmarks[handIdx];
        const now = Date.now();

        if (checkIsFist(landmarks)) {
            if (!wasFist && now - lastFistTime > FIST_COOLDOWN) {
                resetGame();
                lastFistTime = now;
                setGestureStatus('已识别握拳，游戏已重置');
            }
            wasFist = true;
            return;
        }
        wasFist = false;

        const wrist = landmarks[0];
        const middleMcp = landmarks[9];
        const centerX = (wrist.x + middleMcp.x) / 2;

        if (moveAnchorX === null) {
            moveAnchorX = centerX;
        } else if (now - lastMoveTime > MOVE_COOLDOWN) {
            const delta = centerX - moveAnchorX;
            // The webcam image is unmirrored: moving right in the image is the player's left.
            if (delta > MOVE_THRESHOLD) {
                if (!checkCollision(currentPiece, -1, 0)) currentPiece.x--;
                moveAnchorX = centerX;
                lastMoveTime = now;
                render();
            } else if (delta < -MOVE_THRESHOLD) {
                if (!checkCollision(currentPiece, 1, 0)) currentPiece.x++;
                moveAnchorX = centerX;
                lastMoveTime = now;
                render();
            }
        }

        const indexMcp = landmarks[5];
        const pinkyMcp = landmarks[17];
        const angle = Math.atan2(pinkyMcp.y - indexMcp.y, pinkyMcp.x - indexMcp.x) * 180 / Math.PI;

        if (rotationAnchorAngle === null) {
            rotationAnchorAngle = angle;
        } else if (now - lastRotateTime > ROTATE_COOLDOWN) {
            let deltaAngle = angle - rotationAnchorAngle;
            if (deltaAngle > 180) deltaAngle -= 360;
            if (deltaAngle < -180) deltaAngle += 360;

            if (deltaAngle > ROTATE_THRESHOLD) {
                rotatePiece(-1);
                lastRotateTime = now;
                rotationAnchorAngle = angle;
                render();
            } else if (deltaAngle < -ROTATE_THRESHOLD) {
                rotatePiece(1);
                lastRotateTime = now;
                rotationAnchorAngle = angle;
                render();
            }
        }
        setGestureStatus('右手已识别，手势控制已启用');
    }

    function checkIsFist(landmarks) {
        const tips = [8, 12, 16, 20];
        const pips = [6, 10, 14, 18];
        const wrist = landmarks[0];
        let folded = 0;
        for (let i = 0; i < 4; i++) {
            const tipDistance = Math.hypot(landmarks[tips[i]].x - wrist.x, landmarks[tips[i]].y - wrist.y);
            const pipDistance = Math.hypot(landmarks[pips[i]].x - wrist.x, landmarks[pips[i]].y - wrist.y);
            if (tipDistance < pipDistance * 1.1) folded++;
        }
        return folded >= 3;
    }

    cameraRetryBtn.addEventListener('click', startCamera);
    startCamera();
});
