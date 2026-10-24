// 等待页面所有元素加载完成后再执行，彻底避免找不到元素的问题
document.addEventListener('DOMContentLoaded', () => {
    const soundBtn = document.querySelector('.sound-btn');
    const soundIcon = document.getElementById('soundIcon');
    const gameAudio = document.getElementById('gameAudio');

    // 图标链接（已提取你文件里的素材地址，顺序正确）
    const soundIconList = [
        'https://res.cloudinary.com/w24obzi2/image/upload/v1792656560/%E9%9D%99%E9%9F%B3.webp',
        'https://res.cloudinary.com/w24obzi2/image/upload/v1792656560/%E5%A3%B0%E9%9F%B3%E5%B0%8F.webp',
        'https://res.cloudinary.com/w24obzi2/image/upload/v1792656560/%E5%A3%B0%E9%9F%B3%E4%B8%AD.webp',
        'https://res.cloudinary.com/w24obzi2/image/upload/v1792656560/%E5%A3%B0%E9%9F%B3%E5%A4%A7.webp'
    ];

    // 对应音量档位
    const volumeLevel = [0, 0.3, 0.6, 1];
    let volumeIndex = 0;

    // 初始化默认音量
    gameAudio.volume = volumeLevel[volumeIndex];

    // 点击切换事件
    soundBtn.addEventListener('click', () => {
        volumeIndex = (volumeIndex + 1) % soundIconList.length;
        
        // 同步切换图标
        soundIcon.src = soundIconList[volumeIndex];
        // 同步修改实际音量
        gameAudio.volume = volumeLevel[volumeIndex];

        // 非静音时尝试播放音频
        if (volumeIndex > 0 && gameAudio.paused) {
            gameAudio.play().catch(() => {
                console.log("需用户交互后才能播放音频");
            });
        }
    });
});

