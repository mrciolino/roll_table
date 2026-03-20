export type SpellRarity = 'common' | 'uncommon' | 'rare' | 'very_rare' | 'legendary';
export type SpellPool = 'conjuration' | 'staple';

export type SpellCard = {
    id: string;
    fileName: string;
    imageUrl: string;
    displayName: string;
    level: number;
    school: string;
    rarity: SpellRarity;
    pool: SpellPool;
};

const schoolNames = new Set([
    'Abjuration',
    'Conjuration',
    'Divination',
    'Enchantment',
    'Evocation',
    'Illusion',
    'Necromancy',
    'Transmutation',
]);

const levelFolders: Record<string, number> = {
    '0 - Cantrips': 0,
    '1st': 1,
    '2nd': 2,
    '3rd': 3,
    '4th': 4,
    '5th': 5,
    '6th': 6,
    '7th': 7,
    '8th': 8,
    '9th': 9,
};

const rarityForLevel = (level: number): SpellRarity => {
    if (level <= 1) return 'common';
    if (level === 2) return 'uncommon';
    if (level === 3) return 'rare';
    if (level <= 5) return 'very_rare';
    return 'legendary';
};

export const rarityWeights: Record<SpellRarity, number> = {
    common: 42,
    uncommon: 28,
    rare: 18,
    very_rare: 8,
    legendary: 4,
};

const imageModules = import.meta.glob('./Spells/**/*.png', {
    eager: true,
    import: 'default',
}) as Record<string, string>;

function fileBaseName(path: string): string {
    return path.split('/').pop()?.replace(/\.png$/i, '') ?? path;
}

function parseImageMeta(path: string, imageUrl: string): SpellCard | null {
    const parts = path.split('/');
    const folder = parts[2];
    if (!folder || folder === 'Back') {
        return null;
    }

    const level = levelFolders[folder] ?? (Number.parseInt(folder, 10) || 0);
    const fileName = fileBaseName(path);
    const withoutLevel = fileName.replace(new RegExp(`^${level}-`), '');
    const segments = withoutLevel.split('-');

    let school = 'Unknown';
    let namePart = withoutLevel;

    if (segments.length >= 2) {
        const possibleSchool = segments[segments.length - 1].replace(/\d+$/, '');
        if (schoolNames.has(possibleSchool)) {
            school = possibleSchool;
            namePart = segments.slice(0, -1).join('-');
        }
    }

    const cleanedName = namePart.replace(/\d+$/, '').replace(/-/g, ' ').trim();

    return {
        id: fileName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        fileName,
        imageUrl,
        displayName: cleanedName || fileName,
        level,
        school,
        rarity: rarityForLevel(level),
        pool: school === 'Conjuration' ? 'conjuration' : 'staple',
    };
}

export const spellCards = Object.entries(imageModules)
    .map(([path, imageUrl]) => parseImageMeta(path, imageUrl))
    .filter((card): card is SpellCard => card !== null)
    .sort((left, right) => {
        if (left.level !== right.level) return left.level - right.level;
        if (left.rarity !== right.rarity) return left.rarity.localeCompare(right.rarity);
        return left.displayName.localeCompare(right.displayName);
    });

export const currencyPerPack = 50;
export const cardsPerPack = 5;
export const conjurationChance = 0.75;
