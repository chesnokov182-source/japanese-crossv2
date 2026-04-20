import {
    gameStats, addPoints, subtractPoints, saveGameStats,
    availableSkins, purchasedSkins, selectedSkinId,
    isSkinPurchased, purchaseSkin, selectSkin, upgradeMaxHints
} from './storage.js';
import { roulettePrizes, rouletteProbabilities } from './constants.js';
import { showToast, showConfetti, playRouletteSpin, playRouletteWin } from './utils.js';
import { updateAllBlockedSkins } from './crosswordView.js';
import { updateButtonStates } from './gameController.js';

let currentShopTab = localStorage.getItem('shopActiveTab') || 'skins';
let rouletteAnimating = false;

export function openShopModal() {
    const modal = document.getElementById("shopModal");
    const content = modal.querySelector('.modal-content');
    content.innerHTML = `
        <h3 style="margin-top:0;">Магазин</h3>
        <div class="shop-tabs">
            <button class="shop-tab" data-tab="skins">🎨 Скины</button>
            <button class="shop-tab" data-tab="upgrades">⚡ Улучшения</button>
            <button class="shop-tab" data-tab="roulette">🎲 Рулетка</button>
        </div>
        <div class="shop-section skins active"></div>
        <div class="shop-section upgrades"></div>
        <div class="shop-section roulette"></div>
        <div class="modal-buttons" style="margin-top: 20px;">
            <button id="closeShopBtn" class="modal-btn modal-no">Закрыть</button>
        </div>
    `;

    const skinsSection = content.querySelector('.skins');
    const upgradesSection = content.querySelector('.upgrades');
    const rouletteSection = content.querySelector('.roulette');

    // Скины
    availableSkins.forEach(skin => {
        const purchased = isSkinPurchased(skin.id);
        const selected = selectedSkinId === skin.id;
        const div = document.createElement('div');
        div.className = 'skin-item';
        div.innerHTML = `
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
        skinsSection.appendChild(div);
    });

    // Улучшения
    upgradesSection.innerHTML = `
        <div class="upgrade-item">
            <div class="upgrade-info">
                <div class="upgrade-name">📈 Лимит подсказок: 3</div>
                <div class="upgrade-desc">Максимум 3 подсказки на кроссворд</div>
                <div class="upgrade-price">500 очков</div>
            </div>
            <div>
                ${gameStats.maxHints >= 3 ? '<button class="upgrade-btn disabled" disabled>Куплено</button>' : '<button class="upgrade-btn buy" data-upgrade="3" data-price="500">Купить</button>'}
            </div>
        </div>
        <div class="upgrade-item">
            <div class="upgrade-info">
                <div class="upgrade-name">📈 Лимит подсказок: 4</div>
                <div class="upgrade-desc">Максимум 4 подсказки на кроссворд</div>
                <div class="upgrade-price">750 очков</div>
            </div>
            <div>
                ${gameStats.maxHints >= 4 ? '<button class="upgrade-btn disabled" disabled>Куплено</button>' : (gameStats.maxHints >= 3 ? '<button class="upgrade-btn buy" data-upgrade="4" data-price="750">Купить</button>' : '<button class="upgrade-btn disabled" disabled>Сначала купите лимит 3</button>')}
            </div>
        </div>
    `;

    // Рулетка
    rouletteSection.innerHTML = `
        <div class="roulette-container">
            <div class="roulette-spin-area"><span id="rouletteDisplay">🎰</span></div>
            <button id="rouletteSpinBtn" class="roulette-spin-btn">Крутить (20 очков)</button>
            <div id="rouletteResult" class="roulette-result"></div>
            <div class="roulette-info">
                Шансы выигрыша:<br>
                0 – 25% | 10 – 20% | 20 – 20%<br>
                50 – 15% | 100 – 10% | 200 – 10%
            </div>
        </div>
    `;

    // Обработчики
    setupShopEventListeners(content);
    modal.style.display = "flex";
}

function setupShopEventListeners(content) {
    const tabs = content.querySelectorAll('.shop-tab');
    const sections = {
        skins: content.querySelector('.skins'),
        upgrades: content.querySelector('.upgrades'),
        roulette: content.querySelector('.roulette')
    };

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            Object.values(sections).forEach(s => s.classList.remove('active'));
            sections[tabName].classList.add('active');
            currentShopTab = tabName;
            localStorage.setItem('shopActiveTab', tabName);
        });
    });

    // Активация сохранённой вкладки
    const activeTab = [...tabs].find(t => t.dataset.tab === currentShopTab);
    if (activeTab) activeTab.click();
    else tabs[0].click();

    // Кнопки скинов
    content.querySelectorAll('.skin-btn.buy').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            const price = parseInt(btn.dataset.price);
            if (purchaseSkin(id, price)) {
                showConfetti();
                showToast(`Скин куплен!`, "success");
                openShopModal(); // перерисовать
                updateAllBlockedSkins();
            } else {
                showToast("Недостаточно очков или уже куплено", "error");
            }
        });
    });
    content.querySelectorAll('.skin-btn.select').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            if (selectSkin(id)) {
                showToast(`Скин выбран!`, "success");
                openShopModal();
                updateAllBlockedSkins();
            } else {
                showToast("Сначала купите скин", "error");
            }
        });
    });

    // Улучшения
    content.querySelectorAll('.upgrade-btn.buy').forEach(btn => {
        btn.addEventListener('click', () => {
            const newLimit = parseInt(btn.dataset.upgrade);
            const price = parseInt(btn.dataset.price);
            if (upgradeMaxHints(newLimit, price)) {
                showToast(`Лимит подсказок увеличен до ${newLimit}!`, "success");
                openShopModal();
                updateButtonStates();
            } else {
                showToast("Недостаточно очков или уже куплено", "error");
            }
        });
    });

    // Рулетка
    const spinBtn = content.querySelector('#rouletteSpinBtn');
    spinBtn.addEventListener('click', spinRoulette);

    // Закрытие
    content.querySelector('#closeShopBtn').addEventListener('click', () => {
        document.getElementById("shopModal").style.display = "none";
    });
}

function spinRoulette() {
    if (rouletteAnimating) return;
    if (!subtractPoints(20)) return;

    const rand = Math.random() * 100;
    let cumulative = 0;
    let selectedPrize = 0;
    for (let i = 0; i < roulettePrizes.length; i++) {
        cumulative += rouletteProbabilities[i];
        if (rand < cumulative) {
            selectedPrize = roulettePrizes[i];
            break;
        }
    }

    rouletteAnimating = true;
    const display = document.getElementById('rouletteDisplay');
    const resultDiv = document.getElementById('rouletteResult');
    let spins = 0;
    const totalSpins = 20;
    const interval = setInterval(() => {
        const randomTemp = roulettePrizes[Math.floor(Math.random() * roulettePrizes.length)];
        display.textContent = randomTemp;
        playRouletteSpin();
        spins++;
        if (spins >= totalSpins) {
            clearInterval(interval);
            display.textContent = selectedPrize;
            if (selectedPrize > 0) {
                addPoints(selectedPrize);
                resultDiv.innerHTML = `🎉 Вы выиграли ${selectedPrize} очков! 🎉`;
                if (selectedPrize >= 100) showConfetti();
                playRouletteWin(selectedPrize);
            } else {
                resultDiv.innerHTML = `😞 Вам выпало 0 очков.`;
                playRouletteWin(0);
            }
            rouletteAnimating = false;
        }
    }, 50);
}

export function initShop() {
    document.getElementById("shopBtn").addEventListener("click", openShopModal);
}
