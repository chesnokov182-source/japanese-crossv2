import { playBeep } from './audio.js';

// Toast-уведомления
export function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// Модальное окно подтверждения
let confirmResolve = null;
const confirmModal = document.getElementById('confirmModal');
const confirmMessage = document.getElementById('confirmMessage');
const confirmYes = document.getElementById('confirmYes');
const confirmNo = document.getElementById('confirmNo');

export function showConfirmDialog(message) {
    return new Promise((resolve) => {
        confirmResolve = resolve;
        confirmMessage.textContent = message;
        confirmModal.style.display = 'flex';
    });
}

function closeConfirmDialog(result) {
    if (confirmResolve) {
        confirmResolve(result);
        confirmResolve = null;
    }
    confirmModal.style.display = 'none';
}

confirmYes.addEventListener('click', () => closeConfirmDialog(true));
confirmNo.addEventListener('click', () => closeConfirmDialog(false));

// Конфетти
export function showConfetti() {
    const canvas = document.createElement('canvas');
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '9999';
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    let particles = [];
    for (let i = 0; i < 150; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height - canvas.height,
            size: Math.random() * 6 + 2,
            speedY: Math.random() * 8 + 5,
            speedX: (Math.random() - 0.5) * 3,
            color: `hsl(${Math.random() * 360}, 70%, 60%)`
        });
    }
    let animationId = null;
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let allDone = true;
        for (let p of particles) {
            p.y += p.speedY;
            p.x += p.speedX;
            if (p.y < canvas.height + p.size) allDone = false;
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x, p.y, p.size, p.size);
        }
        if (!allDone) {
            animationId = requestAnimationFrame(animate);
        } else {
            cancelAnimationFrame(animationId);
            document.body.removeChild(canvas);
        }
    }
    animate();
    setTimeout(() => {
        if (animationId) cancelAnimationFrame(animationId);
        if (canvas.parentNode) document.body.removeChild(canvas);
    }, 2000);
}

// Звуки-обёртки
export function playPop() { playBeep(880, 0.05, 0.2); }
export function playCorrectInput() { playBeep(1200, 0.04, 0.25); }
export function playErrorInput() { playBeep(200, 0.12, 0.2, 'sawtooth'); }
export function playClick() { playBeep(600, 0.03, 0.1, 'sine'); }
export function playRouletteSpin() { playBeep(800, 0.02, 0.15); }
export function playRouletteWin(prize) {
    if (prize > 0) {
        playBeep(523, 0.15, 0.3);
        setTimeout(() => playBeep(659, 0.15, 0.3), 150);
        setTimeout(() => playBeep(784, 0.2, 0.3), 300);
    } else {
        playBeep(300, 0.3, 0.2, 'sawtooth');
    }
}
