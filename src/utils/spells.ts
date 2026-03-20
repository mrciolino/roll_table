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

const schoolAliases: Record<string, string> = {
    Conjuratoin: 'Conjuration',
};

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
    common: 57,
    uncommon: 32,
    rare: 8,
    very_rare: 2,
    legendary: 1,
};

const imageModules = import.meta.glob('../data/Spells/**/*.png', {
    eager: true,
    import: 'default',
}) as Record<string, string>;

function fileBaseName(path: string): string {
    return path.split('/').pop()?.replace(/\.png$/i, '') ?? path;
}

function normalizeSchool(value: string) {
    const trimmed = value.trim();
    return schoolAliases[trimmed] ?? trimmed;
}

function parseImageMeta(path: string, imageUrl: string): SpellCard | null {
    const parts = path.split('/');
    const spellsFolderIndex = parts.lastIndexOf('Spells');
    const folder = spellsFolderIndex >= 0 ? parts[spellsFolderIndex + 1] : undefined;
    if (!folder || folder === 'Back') {
        return null;
    }

    const fileName = fileBaseName(path);
    const levelMatch = fileName.match(/^(\d+)\s*-/);
    const level = levelMatch
        ? Number.parseInt(levelMatch[1], 10)
        : (levelFolders[folder] ?? (Number.parseInt(folder, 10) || 0));
    const withoutLevel = fileName.replace(/^\d+\s*-\s*/, '');
    const segments = withoutLevel.split('-');

    let school = 'Unknown';
    let namePart = withoutLevel;

    if (segments.length >= 2) {
        const possibleSchool = normalizeSchool(segments[segments.length - 1].replace(/\d+$/, '').trim());
        if (schoolNames.has(possibleSchool)) {
            school = possibleSchool;
            namePart = segments.slice(0, -1).join('-').trim();
        }
    }

    const cleanedName = namePart.replace(/\d+$/, '').replace(/\s*-\s*/g, ' ').trim();

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
