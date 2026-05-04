// js/themes.js
import { subtractPoints, addPoints, gameStats, saveGameStats, updateScoreUI } from './storage.js';
import { showToast, showConfetti, audio } from './utils.js';
import { updateTaskProgress } from './dailyTasks.js';
import { updateAchievementProgress } from './achievements.js';   // <-- добавлен импорт

// Бесплатные темы (всегда доступны)
export const freeThemes = [
    { id: 'light', name: 'Светлая', price: 0, cssClass: '' },
    { id: 'dark', name: 'Тёмная', price: 0, cssClass: 'dark' },
    { id: 'sakura', name: 'Сакура', price: 0, cssClass: 'sakura' }
];

// Покупаемые темы
export const premiumThemes = [
    { id: 'bamboo', name: 'Дзен-бамбук', price: 500, cssClass: 'bamboo', 
      description: 'Зелёные оттенки бамбука, спокойствие' },
    { id: 'fuji', name: 'Фудзи', price: 500, cssClass: 'fuji',
      description: 'Голубые тона горы Фудзи, свежесть' }
];

export let purchasedThemes = [];
export let currentThemeId = 'light';

export function loadThemesData() {
    const saved = localStorage.getItem('themes');
    if (saved) {
        const data = JSON.parse(saved);
        purchasedThemes = data.purchasedThemes || [];
        currentThemeId = data.currentThemeId || 'light';
    } else {
        purchasedThemes = ['light', 'dark', 'sakura'];
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
        updateTaskProgress('buy_skin', 1);
        // Обновляем прогресс достижения для тем (количество купленных премиум-тем)
        const themesCount = purchasedThemes.filter(t => !freeThemes.some(f => f.id === t)).length;
        updateAchievementProgress('themes', themesCount);
        return true;
    }
    return false;
}

export async function confirmPurchaseTheme(themeId) {
    const theme = premiumThemes.find(t => t.id === themeId);
    if (!theme) return false;
    if (purchasedThemes.includes(themeId)) {
        showToast('Тема уже куплена', 'info');
        return false;
    }
    const { showConfirmDialog } = await import('./utils.js');
    const confirmed = await showConfirmDialog(`Купить тему "${theme.name}" за ${theme.price} очков?`);
    if (confirmed) {
        return purchaseTheme(themeId);
    }
    return false;
}

export function getAvailableThemes() {
    return [...freeThemes, ...premiumThemes];
}
