// ========== ЗВУКИ ==========
let audioContext = null;
function initAudio() {
    if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
}
function playBeep(frequency, duration, volume = 0.3, type = 'sine') {
    try {
        initAudio();
        if (audioContext.state === 'suspended') audioContext.resume();
        const now = audioContext.currentTime;
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.type = type;
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(volume, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
        oscillator.start();
        oscillator.stop(now + duration);
    } catch (e) { console.warn("Audio not supported", e); }
}

export const audio = {
    pop: () => playBeep(880, 0.05, 0.2),
    correct: () => playBeep(1200, 0.04, 0.25),
    error: () => playBeep(200, 0.12, 0.2, 'sawtooth'),
    spin: () => playBeep(800, 0.02, 0.15),
    win: (prize) => {
        if (prize > 0) {
            playBeep(523, 0.15, 0.3);
            setTimeout(() => playBeep(659, 0.15, 0.3), 150);
            setTimeout(() => playBeep(784, 0.2, 0.3), 300);
        } else {
            playBeep(300, 0.3, 0.2, 'sawtooth');
        }
    },
    click: () => playBeep(600, 0.03, 0.1, 'sine')
};

// ========== КОНФЕТТИ И ТОСТЫ ==========
// ========== ТОСТЫ СТЕКОМ (ВЕРТИКАЛЬНАЯ СТОПКА) ==========
let toastContainer = null;
let activeToasts = new Set();

function getToastContainer() {
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toastStack';
        toastContainer.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 10001;
            display: flex;
            flex-direction: column;
            gap: 10px;
            pointer-events: none;
        `;
        document.body.appendChild(toastContainer);
    }
    return toastContainer;
}

export function showToast(message, type = 'info') {
    const container = getToastContainer();
    const toast = document.createElement('div');
    toast.className = `toast-stack ${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        background: var(--bg-container-light);
        color: var(--text-light);
        border-radius: 12px;
        padding: 12px 20px;
        font-size: 16px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        border-left: 4px solid ${type === 'success' ? '#2c6e2c' : (type === 'error' ? '#c94f4f' : '#4a6fa5')};
        opacity: 0;
        transform: translateX(50px);
        transition: all 0.3s ease;
        pointer-events: none;
        max-width: 350px;
        word-wrap: break-word;
    `;
    container.appendChild(toast);
    activeToasts.add(toast);
    
    // Анимация появления
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(0)';
    }, 10);
    
    // Удаление через 2.5 секунды
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(50px)';
        setTimeout(() => {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
            activeToasts.delete(toast);
            // Если контейнер пуст, можно удалить его (необязательно)
            if (activeToasts.size === 0 && container.parentNode) {
                container.parentNode.removeChild(container);
                toastContainer = null;
            }
        }, 300);
    }, 5500);
    
    // Ограничение стека: максимум 3 тоста одновременно
    if (activeToasts.size > 3) {
        const oldest = [...activeToasts][0];
        if (oldest && oldest.parentNode) {
            oldest.style.opacity = '0';
            oldest.style.transform = 'translateX(50px)';
            setTimeout(() => {
                if (oldest.parentNode) oldest.parentNode.removeChild(oldest);
                activeToasts.delete(oldest);
            }, 300);
        }
    }
}

export function showConfetti() {
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;';
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    let particles = Array.from({length: 150}, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        size: Math.random() * 6 + 2,
        speedY: Math.random() * 8 + 5,
        speedX: (Math.random() - 0.5) * 3,
        color: `hsl(${Math.random() * 360}, 70%, 60%)`
    }));
    let animationId;
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let allDone = true;
        particles.forEach(p => {
            p.y += p.speedY; p.x += p.speedX;
            if (p.y < canvas.height + p.size) allDone = false;
            ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, p.size, p.size);
        });
        if (!allDone) animationId = requestAnimationFrame(animate);
        else { cancelAnimationFrame(animationId); document.body.removeChild(canvas); }
    }
    animate();
    setTimeout(() => { if(document.body.contains(canvas)) document.body.removeChild(canvas); }, 2000);
}

// ========== МОДАЛЬНОЕ ОКНО ПОДТВЕРЖДЕНИЯ ==========
export function showConfirmDialog(message) {
    return new Promise(resolve => {
        const modal = document.getElementById('confirmModal');
        document.getElementById('confirmMessage').textContent = message;
        modal.style.display = 'flex';
        
        const onYes = () => { cleanup(); resolve(true); };
        const onNo = () => { cleanup(); resolve(false); };
        
        document.getElementById('confirmYes').addEventListener('click', onYes);
        document.getElementById('confirmNo').addEventListener('click', onNo);
        
        function cleanup() {
            modal.style.display = 'none';
            document.getElementById('confirmYes').removeEventListener('click', onYes);
            document.getElementById('confirmNo').removeEventListener('click', onNo);
        }
    });
}

// ========== КАТАКАНА И РОМАДЗИ ==========
export const romajiToKatakana = {
    "a": ["ア"], "i": ["イ"], "u": ["ウ"], "e": ["エ"], "o": ["オ"],
    "ka": ["カ"], "ki": ["キ"], "ku": ["ク"], "ke": ["ケ"], "ko": ["コ"],
    "sa": ["サ"], "shi": ["シ"], "su": ["ス"], "se": ["セ"], "so": ["ソ"],
    "ta": ["タ"], "chi": ["チ"], "tsu": ["ツ"], "te": ["テ"], "to": ["ト"],
    "na": ["ナ"], "ni": ["ニ"], "nu": ["ヌ"], "ne": ["ネ"], "no": ["ノ"],
    "ha": ["ハ"], "hi": ["ヒ"], "fu": ["フ"], "he": ["ヘ"], "ho": ["ホ"],
    "ma": ["マ"], "mi": ["ミ"], "mu": ["ム"], "me": ["メ"], "mo": ["モ"],
    "ya": ["ヤ"], "yu": ["ユ"], "yo": ["ヨ"],
    "ra": ["ラ"], "ri": ["リ"], "ru": ["ル"], "re": ["レ"], "ro": ["ロ"],
    "wa": ["ワ"], "wo": ["ヲ"], "ga": ["ガ"], "gi": ["ギ"], "gu": ["グ"], 
    "ge": ["ゲ"], "go": ["ゴ"], "za": ["ザ"], "ji": ["ジ"], "zu": ["ズ"], 
    "ze": ["ゼ"], "zo": ["ゾ"], "da": ["ダ"], "di": ["ヂ"], "du": ["ヅ"], 
    "de": ["デ"], "do": ["ド"], "ba": ["バ"], "bi": ["ビ"], "bu": ["ブ"], 
    "be": ["ベ"], "bo": ["ボ"], "pa": ["パ"], "pi": ["ピ"], "pu": ["プ"], 
    "pe": ["ペ"], "po": ["ポ"], "kya": ["キ", "ヤ"], "kyu": ["キ", "ユ"], 
    "kyo": ["キ", "ヨ"], "sha": ["シ", "ヤ"], "shu": ["シ", "ユ"], "sho": ["シ", "ヨ"],
    "cha": ["チ", "ヤ"], "chu": ["チ", "ユ"], "cho": ["チ", "ヨ"], "nya": ["ニ", "ヤ"], 
    "nyu": ["ニ", "ユ"], "nyo": ["ニ", "ヨ"], "hya": ["ヒ", "ヤ"], "hyu": ["ヒ", "ユ"], 
    "hyo": ["ヒ", "ヨ"], "mya": ["ミ", "ヤ"], "myu": ["ミ", "ユ"], "myo": ["ミ", "ヨ"],
    "rya": ["リ", "ヤ"], "ryu": ["リ", "ユ"], "ryo": ["リ", "ヨ"], "gya": ["ギ", "ヤ"], 
    "gyu": ["ギ", "ユ"], "gyo": ["ギ", "ヨ"], "ja": ["ジ", "ヤ"], "ju": ["ジ", "ユ"], 
    "jo": ["ジ", "ヨ"], "bya": ["ビ", "ヤ"], "byu": ["ビ", "ユ"], "byo": ["ビ", "ヨ"],
    "pya": ["ピ", "ヤ"], "pyu": ["ピ", "ユ"], "pyo": ["ピ", "ヨ"], "fi": ["フ", "イ"],
    "nn": ["ン"], "-": ["ー"]
};

(function generateDoubledConsonants() {
    const consonants = ['k','s','t','p','c','j','d','b','g','z','r','m','h','f','w'];
    const newEntries = {};
    for (let key in romajiToKatakana) {
        if (!consonants.includes(key[0]) || (key.length > 1 && key[0] === key[1]) || key[0] === 'n') continue;
        const newKey = key[0] + key;
        if (!romajiToKatakana[newKey]) newEntries[newKey] = ['ツ'].concat(romajiToKatakana[key]);
    }
    Object.assign(romajiToKatakana, newEntries);
})();
