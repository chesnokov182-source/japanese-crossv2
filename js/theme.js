const THEME_KEY = 'theme';

export function initTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY) || 'light';
    applyTheme(savedTheme);
}

function applyTheme(theme) {
    document.body.classList.remove('dark', 'sakura');
    if (theme === 'dark') document.body.classList.add('dark');
    else if (theme === 'sakura') document.body.classList.add('sakura');
}

export function toggleTheme() {
    let current = 'light';
    if (document.body.classList.contains('dark')) current = 'dark';
    else if (document.body.classList.contains('sakura')) current = 'sakura';

    let next;
    if (current === 'light') next = 'dark';
    else if (current === 'dark') next = 'sakura';
    else next = 'light';

    applyTheme(next);
    localStorage.setItem(THEME_KEY, next);
}
