export function showTutorial() {
    const modal = document.getElementById("tutorialModal");
    const message = document.getElementById("tutorialMessage");
    const nextBtn = document.getElementById("tutorialNext");
    const closeBtn = document.getElementById("tutorialClose");

    const steps = [
        "Добро пожаловать в японские кроссворды JLPT! 🎌\n\nВ этом туториале вы узнаете основы работы.",
        "📝 Вводите слова английскими буквами (ромадзи).\nПример: 'su' → ス, 'shu' → シ+ユ, 'n' → ン.\nДефис '-' даёт длинную гласную ー.",
        "🎯 За правильно угаданное слово даётся 10 очков, за полный кроссворд – 50 очков.",
        "💰 Очки можно тратить на разблокировку новых кроссвордов, на подсказки (20 очков за подсказку, лимит можно увеличить в магазине), на скины и в рулетке.",
        "🎁 Каждый день вы получаете 50 бонусных очков за вход.",
        "🌓 Кнопка темы переключает светлую/тёмную тему. Прогресс сохраняется автоматически.\n\nПриятной игры!"
    ];
    let step = 0;

    function update() {
        message.innerText = steps[step];
        nextBtn.innerText = step === steps.length - 1 ? "Завершить" : "Далее";
    }

    function next() {
        step++;
        if (step < steps.length) update();
        else close();
    }

    function close() {
        modal.style.display = "none";
        nextBtn.removeEventListener("click", next);
        closeBtn.removeEventListener("click", close);
        localStorage.setItem("tutorialShown", "true");
    }

    nextBtn.addEventListener("click", next);
    closeBtn.addEventListener("click", close);
    step = 0;
    update();
    modal.style.display = "flex";
}

export function initTutorial() {
    if (!localStorage.getItem("tutorialShown")) {
        window.addEventListener("load", () => setTimeout(showTutorial, 500));
    }
    document.getElementById("helpBtn").addEventListener("click", showTutorial);
}
