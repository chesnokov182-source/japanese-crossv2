import { subtractPoints, addPoints, gameStats, saveGameStats, updateScoreUI } from './storage.js';
import { showToast, showConfetti, audio } from './utils.js';
import { updateTaskProgress } from './dailyTasks.js';
import { showConfirmDialog } from './utils.js';
import { updateAchievementProgress } from './achievements.js';

export const freeThemes = [
    { id: 'light', name: 'Светлая', price: 0, cssClass: '' },
    { id: 'dark', name: 'Тёмная', price: 0, cssClass: 'dark' },
    { id: 'sakura', name: 'Сакура', price: 0, cssClass: 'sakura' }
];

export const premiumThemes = [
    { id: 'bamboo', name: 'Дзен-бамбук', price: 500, cssClass: 'bamboo', description: 'Зелёные оттенки бамбука' },
    { id: 'fuji', name: 'Фудзи', price: 500, cssClass: 'fuji', description: 'Голубые тона горы Фудзи' }
];

export let purchasedThemes = []; // id купленных тем
export let currentThemeId = 'light';

export function loadThemesData() {
    const saved = localStorage.getItem('themes');
    if (saved) {
        const data = JSON.parse(saved);
        purchasedThemes = data.purchasedThemes || [];
        currentThemeId = data.currentThemeId || 'light';
    } else {
        purchasedThemes = ['light', 'dark', 'sakura']; // бесплатные доступны сразу
        currentThemeId = 'light';
        saveThemesData();
    }
    applyTheme(currentThemeId);
}

function saveThemesData() {
    localStorage.setItem('themes', JSON.stringify({ purchasedThemes, currentThemeId }));
}

export function applyTheme(themeId) {
    const allThemes = [...freeThemes, ...premiumThemes];
    const theme = allThemes.find(t => t.id === themeId);
    if (!theme) return;
    // Удаляем все классы тем
    document.body.classList.remove('dark', 'sakura', 'bamboo', 'fuji');
    if (theme.cssClass) document.body.classList.add(theme.cssClass);
    currentThemeId = themeId;
    saveThemesData();
}

export function purchaseTheme(themeId) {
    if (purchasedThemes.includes(themeId)) {
        showToast('Тема уже куплена', 'info');
        return false;
    }
    const theme = premiumThemes.find(t => t.id === themeId);
    if (!theme) return false;
    if (subtractPoints(theme.price)) {
        purchasedThemes.push(themeId);
        saveThemesData();
        applyTheme(themeId);
        showConfetti();
        showToast(`Тема "${theme.name}" куплена!`, 'success');
        updateTaskProgress('spend_200_points', theme.price);
        updateTaskProgress('buy_skin', 1); // переиспользуем задание на покупку
        updateAchievementProgress('themes', purchasedThemes.filter(...).length);
        return true;
    }
    return false;
}

export function getAvailableThemes() {
    return [...freeThemes, ...premiumThemes];
}

// Для UI – рендеринг списка тем в модалке выбора
export function renderThemesList(container) {
    const allThemes = [...freeThemes, ...premiumThemes];
    container.innerHTML = '';
    allThemes.forEach(theme => {
        const isOwned = purchasedThemes.includes(theme.id);
        const isCurrent = currentThemeId === theme.id;
        const div = document.createElement('div');
        div.className = 'skin-item'; // переиспользуем стили
        div.innerHTML = `
            <div class="skin-info">
                <div class="skin-emoji">${theme.id === 'bamboo' ? '🎋' : (theme.id === 'fuji' ? '🗻' : '🎨')}</div>
                <div class="skin-details">
                    <div class="skin-name">${theme.name}</div>
                    <div class="skin-price">${theme.price > 0 ? `${theme.price} очков` : 'бесплатно'}</div>
                    <div class="upgrade-desc">${theme.description || ''}</div>
                </div>
            </div>
            <div>
                ${!isOwned ? `<button class="skin-btn buy" data-id="${theme.id}" data-price="${theme.price}">Купить</button>` :
                  (isCurrent ? `<button class="skin-btn selected" disabled>Активна</button>` :
                   `<button class="skin-btn select" data-id="${theme.id}">Применить</button>`)}
            </div>
        `;
        container.appendChild(div);
    });
    // Навешиваем события
    container.querySelectorAll('.skin-btn.buy').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = btn.dataset.id;
            const price = parseInt(btn.dataset.price);
            if (purchaseTheme(id)) renderThemesList(container);
        });
    });
    container.querySelectorAll('.skin-btn.select').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = btn.dataset.id;
            applyTheme(id);
            renderThemesList(container);
            showToast(`Тема "${allThemes.find(t=>t.id===id).name}" применена`, 'success');
        });
    });
}

export async function confirmPurchaseTheme(themeId) {
    const theme = premiumThemes.find(t => t.id === themeId);
    if (!theme) return false;
    if (purchasedThemes.includes(themeId)) {
        showToast('Тема уже куплена', 'info');
        return false;
    }
    const confirmed = await showConfirmDialog(`Купить тему "${theme.name}" за ${theme.price} очков?`);
    if (confirmed) {
        return purchaseTheme(themeId);
    }
    return false;
}
