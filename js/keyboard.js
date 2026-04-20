import { utils } from './utils.js';

export const keyboard = {
    container: null,
    targetInput: null,
    
    // Раскладка (можно расширить)
    layout: [
        ['A', 'I', 'U', 'E', 'O'],
        ['KA', 'KI', 'KU', 'KE', 'KO'],
        ['SA', 'SHI', 'SU', 'SE', 'SO'],
        ['TA', 'CHI', 'TSU', 'TE', 'TO'],
        ['NA', 'NI', 'NU', 'NE', 'NO'],
        ['HA', 'HI', 'FU', 'HE', 'HO'],
        ['MA', 'MI', 'MU', 'ME', 'MO'],
        ['YA', 'YU', 'YO', 'RA', 'RI'],
        ['RU', 'RE', 'RO', 'WA', 'WO'],
        ['N', 'BACKSPACE']
    ],

    init() {
        this.container = document.createElement('div');
        this.container.id = 'virtual-keyboard';
        this.container.classList.add('v-keyboard', 'hidden');
        document.body.appendChild(this.container);
        this.render();
    },

    render() {
        this.container.innerHTML = '';
        this.layout.forEach(row => {
            const rowDiv = document.createElement('div');
            rowDiv.classList.add('k-row');
            
            row.forEach(key => {
                const btn = document.createElement('button');
                btn.classList.add('k-key');
                if (key === 'BACKSPACE') {
                    btn.innerHTML = '⌫';
                    btn.classList.add('k-backspace');
                } else {
                    btn.textContent = key;
                }
                
                // Предотвращаем потерю фокуса с инпута при клике на кнопку
                btn.addEventListener('mousedown', (e) => e.preventDefault());
                btn.addEventListener('click', () => this.handleKeyPress(key));
                
                rowDiv.appendChild(btn);
            });
            this.container.appendChild(rowDiv);
        });
    },

    handleKeyPress(key) {
        if (!this.targetInput) return;

        // Легкая вибрация при нажатии (на смартфонах)
        if (navigator.vibrate) navigator.vibrate(10);

        if (key === 'BACKSPACE') {
            this.targetInput.value = '';
            // Генерируем событие ввода, чтобы сработала логика кроссворда
            this.targetInput.dispatchEvent(new Event('input'));
        } else {
            this.targetInput.value = key;
            this.targetInput.dispatchEvent(new Event('input'));
        }
    },

    show(input) {
        this.targetInput = input;
        this.container.classList.remove('hidden');
        // Скроллим к инпуту, чтобы клавиатура его не перекрыла
        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
    },

    hide() {
        this.container.classList.add('hidden');
        this.targetInput = null;
    }
};
