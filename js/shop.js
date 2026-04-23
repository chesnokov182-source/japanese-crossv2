import { gameStats, saveGameStats, subtractPoints, addPoints, updateScoreUI } from './storage.js';
import { audio, showToast, showConfetti } from './utils.js';
import { updateAllBlockedSkins, updateButtonStates } from './crossword.js';
import { updateTaskProgress } from './dailyTasks.js';

export const availableSkins = [
    { id: "default", name: "Без скина", emoji: "", price: 0, default: true },
    { id: "japan_flag", name: "Флаг Японии", emoji: "🎌", price: 100 },
    { id: "katana", name: "Катана", emoji: "🗡️", price: 150 },
    { id: "sakura", name: "Цветок сакуры", emoji: "🌸", price: 200 },
    { id: "fan", name: "Веер", emoji: "🎐", price: 250 },
    { id: "sushi", name: "Суши", emoji: "🍣", price: 300 },
    { id: "geisha", name: "Гейша", emoji: "👘", price: 350 },
    { id: "tempura", name: "Тэмпура", emoji: "🍤", price: 400 },
    { id: "dragon", name: "Дракон", emoji: "🐉", price: 500 }
];

export let purchasedSkins = [];
export let selectedSkinId = "default";
let rouletteAnimating = false;

export function loadSkinsData() {
    const saved = localStorage.getItem("skins");
    if (saved) {
        const data = JSON.parse(saved);
        purchasedSkins = data.purchasedSkins || [];
        selectedSkinId = data.selectedSkinId || "default";
    } else {
        purchasedSkins = ["default"];
        selectedSkinId = "default";
        saveSkinsData();
    }
}

function saveSkinsData() {
    localStorage.setItem("skins", JSON.stringify({ purchasedSkins, selectedSkinId }));
}

export function getSelectedSkinEmoji() {
    const skin = availableSkins.find(s => s.id === selectedSkinId);
    return skin ? skin.emoji : "";
}

function purchaseSkin(skinId, price) {
    if (purchasedSkins.includes(skinId)) return showToast("Скин уже куплен!", "error");
    if (subtractPoints(price)) {
        purchasedSkins.push(skinId);
        saveSkinsData();
        showConfetti();
        showToast(`Скин куплен!`, "success");
        updateTaskProgress('buy_skin', 1);
        return true;
    }
    return false;
}

function selectSkin(skinId) {
    if (!purchasedSkins.includes(skinId)) return showToast("Сначала купите этот скин!", "error");
    selectedSkinId = skinId;
    saveSkinsData();
    showToast(`Скин выбран!`, "success");
    updateAllBlockedSkins();
    return true;
}

function upgradeMaxHints(newLimit, price) {
    if (newLimit <= gameStats.maxHints) return showToast("Уже куплено!", "error");
    if (subtractPoints(price)) {
        gameStats.maxHints = newLimit;
        saveGameStats();
        showToast(`Лимит подсказок увеличен до ${newLimit}!`, "success");
        updateButtonStates();
        return true;
    }
    return false;
}

function canSpinFree() {
    const last = localStorage.getItem('lastFreeSpin');
    const today = new Date().toDateString();
    return last !== today;
}

function markSpinUsed() {
    localStorage.setItem('lastFreeSpin', new Date().toDateString());
}

function spinRoulette(isFree = false) {
    if (rouletteAnimating) return;
    
    if (!isFree) {
        if (!subtractPoints(20)) return;
    } else {
        if (!canSpinFree()) {
            showToast("Сегодня вы уже крутили бесплатно!", "info");
            return;
        }
    }

    const prizes = [0, 10, 20, 50, 100, 200];
    const probs = [25, 20, 20, 15, 10, 10];
    const rand = Math.random() * 100;
    let cumulative = 0, selectedPrize = 0;
    for (let i = 0; i < prizes.length; i++) {
        cumulative += probs[i];
        if (rand < cumulative) { selectedPrize = prizes[i]; break; }
    }

    rouletteAnimating = true;
    const display = document.getElementById('rouletteDisplay');
    const result = document.getElementById('rouletteResult');
    let spins = 0;
    const interval = setInterval(() => {
        display.textContent = prizes[Math.floor(Math.random() * prizes.length)];
        audio.spin();
        spins++;
        if (spins >= 20) {
            clearInterval(interval);
            display.textContent = selectedPrize;
            if (selectedPrize > 0) {
                addPoints(selectedPrize);
                result.innerHTML = isFree
                    ? `🎉 Бесплатно выиграли ${selectedPrize} очков! 🎉`
                    : `🎉 Вы выиграли ${selectedPrize} очков! 🎉`;
                if (selectedPrize >= 100) showConfetti();
                audio.win(selectedPrize);
                if (!isFree && selectedPrize >= 50) {
                    updateTaskProgress('win_roulette', selectedPrize);
                }
                if (isFree) markSpinUsed();
            } else {
                result.innerHTML = isFree
                    ? `😞 Бесплатно выпало 0 очков. Повезёт завтра!`
                    : `😞 Вам выпало 0 очков. Повезёт в следующий раз!`;
                audio.win(0);
            }
            rouletteAnimating = false;
        }
    }, 50);
}

export function openShopModal() {
    const modal = document.getElementById("shopModal");
    const modalContent = modal.querySelector('.modal-content');
    
    let currentShopTab = localStorage.getItem('shopActiveTab') || 'skins';
    
    const oldTitle = modalContent.querySelector('h3');
    if (oldTitle) oldTitle.remove();
    
    let tabsContainer = modalContent.querySelector('.shop-tabs');
    if (!tabsContainer) {
        tabsContainer = document.createElement('div');
        tabsContainer.className = 'shop-tabs';
        modalContent.insertBefore(tabsContainer, modalContent.firstChild);
    }
    tabsContainer.innerHTML = `
        <button class="shop-tab" data-tab="skins">🎨 Скины</button>
        <button class="shop-tab" data-tab="upgrades">⚡ Улучшения</button>
        <button class="shop-tab" data-tab="roulette">🎲 Рулетка</button>
    `;

    let skinsSection = modalContent.querySelector('.shop-section.skins');
    let upgradesSection = modalContent.querySelector('.shop-section.upgrades');
    let rouletteSection = modalContent.querySelector('.shop-section.roulette');

    if (!skinsSection) {
        skinsSection = document.createElement('div'); skinsSection.className = 'shop-section skins';
        upgradesSection = document.createElement('div'); upgradesSection.className = 'shop-section upgrades';
        rouletteSection = document.createElement('div'); rouletteSection.className = 'shop-section roulette';
        modalContent.append(skinsSection, upgradesSection, rouletteSection);
    }
    
    skinsSection.innerHTML = '';
    for (let skin of availableSkins) {
        const purchased = purchasedSkins.includes(skin.id);
        const selected = (selectedSkinId === skin.id);
        const skinDiv = document.createElement("div");
        skinDiv.className = "skin-item";
        skinDiv.innerHTML = `
            <div class="skin-info">
                <div class="skin-emoji">${skin.emoji || "🖼️"}</div>
                <div class="skin-details">
                    <div class="skin-name">${skin.name}</div>
                    <div class="skin-price">${skin.price > 0 ? `${skin.price} очков` : "бесплатно"}</div>
                </div>
            </div>
            <div>
                ${!purchased ? `<button class="skin-btn buy" data-id="${skin.id}" data-price="${skin.price}">Купить</button>` :
                  (selected ? `<button class="skin-btn selected" disabled>Выбран</button>` :
                   `<button class="skin-btn select" data-id="${skin.id}">Выбрать</button>`)}
            </div>
        `;
        skinsSection.appendChild(skinDiv);
    }
    
    upgradesSection.innerHTML = `
        <div class="upgrade-item">
            <div class="upgrade-info"><div class="upgrade-name">📈 Лимит подсказок: 3</div><div class="upgrade-price">500 очков</div></div>
            <div>${gameStats.maxHints >= 3 ? '<button class="upgrade-btn disabled" disabled>Куплено</button>' : '<button class="upgrade-btn buy" data-upgrade="3" data-price="500">Купить</button>'}</div>
        </div>
        <div class="upgrade-item">
            <div class="upgrade-info"><div class="upgrade-name">📈 Лимит подсказок: 4</div><div class="upgrade-price">750 очков</div></div>
            <div>${gameStats.maxHints >= 4 ? '<button class="upgrade-btn disabled" disabled>Куплено</button>' : (gameStats.maxHints >= 3 ? '<button class="upgrade-btn buy" data-upgrade="4" data-price="750">Купить</button>' : '<button class="upgrade-btn disabled" disabled>Сначала купите лимит 3</button>')}</div>
        </div>
    `;

    rouletteSection.innerHTML = `
        <div class="roulette-container">
            <div class="roulette-spin-area"><span id="rouletteDisplay">🎰</span></div>
            <button id="rouletteSpinBtn" class="roulette-spin-btn">Крутить (20 очков)</button>
            <button id="rouletteFreeBtn" class="roulette-spin-btn" style="margin-top: 10px;">🎲 Бесплатное вращение (раз в день)</button>
            <div id="rouletteResult" class="roulette-result"></div>
            <div class="roulette-info">Шансы выигрыша:<br>0 очк. – 25% | 10 очк. – 20% | 20 очк. – 20% | 50 очк. – 15% | 100 очк. – 10% | 200 очк. – 10%</div>
        </div>
    `;

    const spinBtn = document.getElementById('rouletteSpinBtn');
    if (spinBtn) {
        spinBtn.replaceWith(spinBtn.cloneNode(true));
        const newSpinBtn = document.getElementById('rouletteSpinBtn');
        newSpinBtn.addEventListener('click', () => spinRoulette(false));
    }
    const freeSpinBtn = document.getElementById('rouletteFreeBtn');
    if (freeSpinBtn) {
        freeSpinBtn.replaceWith(freeSpinBtn.cloneNode(true));
        const newFreeBtn = document.getElementById('rouletteFreeBtn');
        if (!canSpinFree()) newFreeBtn.disabled = true;
        newFreeBtn.addEventListener('click', () => spinRoulette(true));
    }

    skinsSection.querySelectorAll('.skin-btn.buy').forEach(btn => btn.addEventListener('click', () => { if(purchaseSkin(btn.dataset.id, parseInt(btn.dataset.price))) openShopModal(); }));
    skinsSection.querySelectorAll('.skin-btn.select').forEach(btn => btn.addEventListener('click', () => { if(selectSkin(btn.dataset.id)) openShopModal(); }));
    upgradesSection.querySelectorAll('.upgrade-btn.buy').forEach(btn => btn.addEventListener('click', () => { if(upgradeMaxHints(parseInt(btn.dataset.upgrade), parseInt(btn.dataset.price))) openShopModal(); }));

    const tabs = tabsContainer.querySelectorAll('.shop-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentShopTab = tab.dataset.tab;
            localStorage.setItem('shopActiveTab', currentShopTab);
            skinsSection.classList.toggle('active', currentShopTab === 'skins');
            upgradesSection.classList.toggle('active', currentShopTab === 'upgrades');
            rouletteSection.classList.toggle('active', currentShopTab === 'roulette');
        });
    });
    const activeTab = Array.from(tabs).find(t => t.dataset.tab === currentShopTab);
    if (activeTab) activeTab.classList.add('active');
    skinsSection.classList.toggle('active', currentShopTab === 'skins');
    upgradesSection.classList.toggle('active', currentShopTab === 'upgrades');
    rouletteSection.classList.toggle('active', currentShopTab === 'roulette');

    modal.style.display = "flex";
}
