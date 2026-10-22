const soundBtn = document.querySelector('.sound-btn');
const soundIcon = document.getElementById('soundIcon');
// 循环顺序：静音(图4) → 1弧线(图5) →2弧线(图6)→3弧线(图7)→回到静音(图4)
const soundSrcList = [
    'icon-mute.png',
    'icon-vol1.png',
    'icon-vol2.png',
    'icon-vol3.png'
];
let index = 0;

soundBtn.addEventListener('click', ()=>{
    index = (index + 1) % soundSrcList.length;
    soundIcon.src = soundSrcList[index];
})
