let audioContext = null;

export function initAudio() {
    // Аудиоконтекст создаётся при первом взаимодействии пользователя
    document.body.addEventListener('click', () => {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            audioContext.resume();
        }
    }, { once: true });
}

export function playBeep(frequency, duration, volume = 0.3, type = 'sine') {
    try {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
        const now = audioContext.currentTime;
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.type = type;
        osc.frequency.value = frequency;
        gain.gain.setValueAtTime(volume, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
        osc.start();
        osc.stop(now + duration);
    } catch (e) {
        // Игнорируем ошибки (например, в браузерах без Web Audio)
    }
}
