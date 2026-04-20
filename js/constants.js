// Таблица ромадзи → катакана
export const romajiToKatakana = {
    "a": ["ア"], "i": ["イ"], "u": ["ウ"], "e": ["エ"], "o": ["オ"],
    "ka": ["カ"], "ki": ["キ"], "ku": ["ク"], "ke": ["ケ"], "ko": ["コ"],
    "sa": ["サ"], "shi": ["シ"], "su": ["ス"], "se": ["セ"], "so": ["ソ"],
    "ta": ["タ"], "chi": ["チ"], "tsu": ["ツ"], "te": ["テ"], "to": ["ト"],
    "na": ["ナ"], "ni": ["ニ"], "nu": ["ヌ"], "ne": ["ネ"], "no": ["ノ"],
    "ha": ["ハ"], "hi": ["ヒ"], "fu": ["フ"], "he": ["ヘ"], "ho": ["ホ"],
    "ma": ["マ"], "mi": ["ミ"], "mu": ["ム"], "me": ["メ"], "mo": ["モ"],
    "ya": ["ヤ"], "yu": ["ユ"], "yo": ["ヨ"],
    "ra": ["ラ"], "ri": ["リ"], "ru": ["ル"], "re": ["レ"], "ro": ["ロ"],
    "wa": ["ワ"], "wo": ["ヲ"],
    "ga": ["ガ"], "gi": ["ギ"], "gu": ["グ"], "ge": ["ゲ"], "go": ["ゴ"],
    "za": ["ザ"], "ji": ["ジ"], "zu": ["ズ"], "ze": ["ゼ"], "zo": ["ゾ"],
    "da": ["ダ"], "di": ["ヂ"], "du": ["ヅ"], "de": ["デ"], "do": ["ド"],
    "ba": ["バ"], "bi": ["ビ"], "bu": ["ブ"], "be": ["ベ"], "bo": ["ボ"],
    "pa": ["パ"], "pi": ["ピ"], "pu": ["プ"], "pe": ["ペ"], "po": ["ポ"],
    "kya": ["キ", "ヤ"], "kyu": ["キ", "ユ"], "kyo": ["キ", "ヨ"],
    "sha": ["シ", "ヤ"], "shu": ["シ", "ユ"], "sho": ["シ", "ヨ"],
    "cha": ["チ", "ヤ"], "chu": ["チ", "ユ"], "cho": ["チ", "ヨ"],
    "nya": ["ニ", "ヤ"], "nyu": ["ニ", "ユ"], "nyo": ["ニ", "ヨ"],
    "hya": ["ヒ", "ヤ"], "hyu": ["ヒ", "ユ"], "hyo": ["ヒ", "ヨ"],
    "mya": ["ミ", "ヤ"], "myu": ["ミ", "ユ"], "myo": ["ミ", "ヨ"],
    "rya": ["リ", "ヤ"], "ryu": ["リ", "ユ"], "ryo": ["リ", "ヨ"],
    "gya": ["ギ", "ヤ"], "gyu": ["ギ", "ユ"], "gyo": ["ギ", "ヨ"],
    "ja": ["ジ", "ヤ"], "ju": ["ジ", "ユ"], "jo": ["ジ", "ヨ"],
    "bya": ["ビ", "ヤ"], "byu": ["ビ", "ユ"], "byo": ["ビ", "ヨ"],
    "pya": ["ピ", "ヤ"], "pyu": ["ピ", "ユ"], "pyo": ["ピ", "ヨ"],
    "fi": ["フ", "イ"],
    "nn": ["ン"],
    "-": ["ー"]
};

// Генерация удвоенных согласных (kk → ツカ и т.д.)
(function generateDoubledConsonants() {
    const consonants = ['k','s','t','p','c','j','d','b','g','z','r','m','h','f','w'];
    const newEntries = {};
    for (let key in romajiToKatakana) {
        const firstChar = key[0];
        if (!consonants.includes(firstChar)) continue;
        if (key.length > 1 && key[0] === key[1]) continue;
        if (firstChar === 'n') continue;
        const newKey = firstChar + key;
        if (romajiToKatakana[newKey]) continue;
        const originalValue = romajiToKatakana[key];
        newEntries[newKey] = ['ツ'].concat(originalValue);
    }
    Object.assign(romajiToKatakana, newEntries);
})();

// Ключи localStorage
export const STORAGE_KEYS = {
    PROGRESS: 'crosswordProgress',
    COMPLETED: 'completedCrosswords',
    UNLOCKED: 'unlockedCrosswords',
    EARNED: 'earnedPoints',
    GAME_STATS: 'gameStats',
    SKINS: 'skins',
    THEME: 'theme',
    TUTORIAL_SHOWN: 'tutorialShown',
    LAST_PLAYED_LEVEL: 'lastPlayedLevel',
    LAST_PLAYED_PUZZLE: 'lastPlayedPuzzle',
    SHOP_ACTIVE_TAB: 'shopActiveTab'
};

// Доступные скины
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

// Рулетка
export const roulettePrizes = [0, 10, 20, 50, 100, 200];
export const rouletteProbabilities = [25, 20, 20, 15, 10, 10];
