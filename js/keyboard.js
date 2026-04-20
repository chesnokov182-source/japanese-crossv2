import { showToast } from './utils.js';

export const keyboard = {
    container: null,
    targetInput: null,
    
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
        // Создаем контейнер, если его еще нет
        if (!document.getElementById('virtual-keyboard')) {
            this.container = document.createElement('div');
            this.container.id = 'virtual-keyboard';
            this.container.classList.add('v-keyboard', 'hidden');
            document.body.appendChild(this.container);
            this.render();
        }
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
                
                // Запрещаем кнопке забирать фокус у инпута
                btn.addEventListener('mousedown', (e) => e.preventDefault());
                btn.addEventListener('click', () => this.handleKeyPress(key));
                
                rowDiv.appendChild(btn);
            });
            this.container.appendChild(rowDiv);
        });
    },

handleKeyPress(key) {
    if (!this.targetInput) return;

    if (navigator.vibrate) navigator.vibrate(10);

    if (key === 'BACKSPACE') {
        this.targetInput.value = '';
    } else {
        this.targetInput.value = key;
    }

    const inputEvent = new Event('input', { bubbles: true });
    this.targetInput.dispatchEvent(inputEvent);

    this.targetInput.focus();
},

    show(input) {
        this.targetInput = input;
        if (this.container) {
            this.container.classList.remove('hidden');
            this.container.style.display = 'flex'; 
            this.container.style.zIndex = "10000";
        }
        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
    },

    hide() {
        if (this.container) {
            this.container.classList.add('hidden');
        }
        this.targetInput = null;
    }
};
