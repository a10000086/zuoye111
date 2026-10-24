// 获取元素
const soundBtn = document.querySelector('.sound-btn');
const soundIcon = document.getElementById('soundIcon');
const gameAudio = document.getElementById('gameAudio');

// 图标路径（和你之前的素材对应）
const soundIconList = [
    'https://res.cloudinary.com/w24obzi2/image/upload/v1792656560/%E9%9D%99%E9%9F%B3.webp',   // 索引0：静音
    'https://res.cloudinary.com/w24obzi2/image/upload/v1792656560/%E5%A3%B0%E9%9F%B3%E5%B0%8F.webp',   // 索引1：小音量
    'https://res.cloudinary.com/w24obzi2/image/upload/v1792656560/%E5%A3%B0%E9%9F%B3%E4%B8%AD.webp',   // 索引2：中音量
    'https://res.cloudinary.com/w24obzi2/image/upload/v1792656560/%E5%A3%B0%E9%9F%B3%E5%A4%A7.webp'    // 索引3：最大音量
];

// 对应音量值（范围 0 ~ 1，0=静音，1=最大）
const volumeLevel = [0, 0.3, 0.6, 1];

// 当前档位，默认从静音开始
let volumeIndex = 0;

// 初始化默认音量
gameAudio.volume = volumeLevel[volumeIndex];

// 点击按钮切换
soundBtn.addEventListener('click', () => {
    // 循环切换档位
    volumeIndex = (volumeIndex + 1) % soundIconList.length;
    
    // 1. 切换图标
    soundIcon.src = soundIconList[volumeIndex];
    // 2. 修改实际音量
    gameAudio.volume = volumeLevel[volumeIndex];

    // 可选：切换到非静音时自动播放音频
    if (volumeIndex > 0 && gameAudio.paused) {
        gameAudio.play().catch(() => {
            // 浏览器禁止自动播放时的容错处理
            console.log("需用户交互后才能播放音频");
        });
    }
});
