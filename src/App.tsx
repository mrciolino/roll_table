import { useCallback, useEffect, useMemo, useRef, useState, type TouchEvent } from 'react';
import {
    cardsPerPack,
    conjurationChance,
    currencyPerPack,
    rarityWeights as defaultRarityWeights,
    spellCards,
    type SpellCard,
    type SpellPool,
    type SpellRarity,
} from './data/spells';
import { weightedPick } from './utils/roll';

// ── Types ────────────────────────────────────────────────
type GeneratedResult = {
    card: SpellCard;
    pool: SpellPool;
    isShiny: boolean;
};

type SelectedCard = {
    card: SpellCard;
    pool: SpellPool;
    isShiny: boolean;
    packIndex: number;
    cardIndex: number;
};

// ── Constants ────────────────────────────────────────────
const rarityOrder: SpellRarity[] = ['common', 'uncommon', 'rare', 'very_rare', 'legendary'];
const schoolOrder = [
    'Conjuration', 'Abjuration', 'Divination', 'Enchantment',
    'Evocation', 'Illusion', 'Necromancy', 'Transmutation', 'Unknown',
] as const;

// ── Design tokens ────────────────────────────────────────
const panel = 'bg-slate-900/90 border border-slate-700/60 shadow-xl backdrop-blur-sm rounded-2xl';
const field = 'grid gap-1 p-2 rounded-xl bg-white/5 border border-slate-700/50';
const row = 'flex justify-between gap-3 px-3 py-1.5 text-xs rounded-lg bg-white/5 border border-slate-700/50';
const tag = 'px-2 py-0.5 rounded-full text-indigo-200 text-xs bg-indigo-500/15 border border-indigo-400/15';
const shinyTag = 'px-2 py-0.5 rounded-full text-xs bg-gradient-to-r from-slate-300/40 to-slate-400/20 border border-slate-300/30 text-white';
const inp = 'w-full border border-slate-600/50 rounded-lg py-1.5 px-2.5 text-slate-50 bg-slate-950/60 outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/40 transition-colors text-sm';
const eyebrow = 'text-xs uppercase tracking-widest text-sky-400 m-0 mb-0.5 font-medium';
const secTitle = 'text-xs font-semibold text-slate-400 uppercase tracking-wider mt-0 mb-0';
const statLabel = 'text-xs font-medium text-indigo-300/70 uppercase tracking-wider leading-none';
const muted = 'text-slate-400 text-sm';

// ── Helpers ──────────────────────────────────────────────
function formatPool(pool: SpellPool) {
    return pool === 'conjuration' ? 'Conjuration' : 'Staple';
}
function formatRarity(r: SpellCard['rarity']) {
    return r.replace('_', ' ');
}
function generatePack(n: number, conjRate: number, weights: Record<SpellRarity, number>): GeneratedResult[] {
    const conj = spellCards.filter((c) => c.pool === 'conjuration');
    const staple = spellCards.filter((c) => c.pool === 'staple');
    return Array.from({ length: n }, () => {
        const pool: SpellPool = Math.random() < conjRate ? 'conjuration' : 'staple';
        const card = weightedPick(pool === 'conjuration' ? conj : staple, (e) => weights[e.rarity]);
        return { card, pool, isShiny: Math.random() < 0.01 };
    });
}
function countBy<T extends string>(values: T[]) {
    return values.reduce<Record<T, number>>((acc, v) => {
        acc[v] = (acc[v] ?? 0) + 1;
        return acc;
    }, {} as Record<T, number>);
}

// ── Component ────────────────────────────────────────────
export default function App() {
    const [gold, setGold] = useState(150);
    const [packPrice, setPackPrice] = useState(currencyPerPack);
    const [cardsInPack, setCardsInPack] = useState(cardsPerPack);
    const [conjurationRate, setConjurationRate] = useState(Math.round(conjurationChance * 100));
    const [rarityWeights, setRarityWeights] = useState<Record<SpellRarity, number>>(defaultRarityWeights);
    const [packs, setPacks] = useState<GeneratedResult[][]>([]);
    const [lastOpenedAt, setLastOpenedAt] = useState<string | null>(null);
    const [selectedCard, setSelectedCard] = useState<SelectedCard | null>(null);
    const [showMobileSettings, setShowMobileSettings] = useState(false);
    const [showMobileStats, setShowMobileStats] = useState(false);
    const touchStart = useRef<{ x: number; y: number } | null>(null);

    // Navigate within the modal (dPack: pack delta, dCard: card delta)
    const navigate = useCallback((dPack: number, dCard: number) => {
        setSelectedCard((cur) => {
            if (!cur) return null;
            const newPackIndex = Math.max(0, Math.min(packs.length - 1, cur.packIndex + dPack));
            const newPack = packs[newPackIndex];
            if (!newPack) return null;
            // When moving between packs, keep card index clamped; when navigating cards wrap within pack
            const newCardIndex = Math.max(0, Math.min(newPack.length - 1, cur.cardIndex + dCard));
            const entry = newPack[newCardIndex];
            return { card: entry.card, pool: entry.pool, isShiny: entry.isShiny, packIndex: newPackIndex, cardIndex: newCardIndex };
        });
    }, [packs]);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') { setSelectedCard(null); return; }
            if (!selectedCard) return;
            if (e.key === 'ArrowLeft') { e.preventDefault(); navigate(0, -1); }
            if (e.key === 'ArrowRight') { e.preventDefault(); navigate(0, 1); }
            if (e.key === 'ArrowUp') { e.preventDefault(); navigate(-1, 0); }
            if (e.key === 'ArrowDown') { e.preventDefault(); navigate(1, 0); }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [selectedCard, navigate]);

    const packCount = packPrice > 0 ? Math.max(0, Math.floor(gold / packPrice)) : 0;
    const totalCards = packCount * cardsInPack;

    const stats = useMemo(() => {
        const all = packs.flat();
        return {
            totalOpened: all.length,
            averageLevel: all.length ? (all.reduce((s, e) => s + e.card.level, 0) / all.length).toFixed(1) : '0.0',
            shiny: all.filter((e) => e.isShiny).length,
            rarity: countBy(all.map((e) => e.card.rarity)),
            pool: countBy(all.map((e) => e.pool)),
            schools: countBy(all.map((e) => e.card.school)),
        };
    }, [packs]);

    const libStats = useMemo(() => {
        const c = spellCards.filter((c) => c.pool === 'conjuration').length;
        return { total: spellCards.length, conjuration: c, staple: spellCards.length - c };
    }, []);
    const packSettings = [
        { label: 'Gold budget', value: gold, min: 0, max: undefined, step: 5, set: (v: number) => setGold(Math.max(0, v)) },
        { label: 'Gold per pack', value: packPrice, min: 1, max: undefined, step: 5, set: (v: number) => setPackPrice(Math.max(1, v)) },
        { label: 'Cards per pack', value: cardsInPack, min: 1, max: 20, step: 1, set: (v: number) => setCardsInPack(Math.min(20, Math.max(1, v))) },
        { label: 'Conjuration rate %', value: conjurationRate, min: 0, max: 100, step: 1, set: (v: number) => setConjurationRate(Math.min(100, Math.max(0, v))) },
    ];
    const libraryInfo = [
        ['Available cards', libStats.total],
        ['Conjuration library', libStats.conjuration],
        ['Staple library', libStats.staple],
        ['Packs this batch', packCount],
        ['Cards this batch', totalCards],
    ] as const;
    const sessionStats = [
        { label: 'Opened packs', value: packs.length },
        { label: 'Opened cards', value: stats.totalOpened },
        { label: 'Conjuration pulls', value: stats.pool.conjuration ?? 0 },
        { label: 'Staple pulls', value: stats.pool.staple ?? 0 },
        { label: 'Avg. level', value: stats.averageLevel },
        { label: 'Shiny pulls', value: stats.shiny },
    ] as const;

    function setWeight(rarity: SpellRarity, value: number) {
        setRarityWeights((cur) => ({ ...cur, [rarity]: Math.max(0, value) }));
    }
    function openPacks() {
        setPacks(Array.from({ length: packCount }, () =>
            generatePack(cardsInPack, conjurationRate / 100, rarityWeights)));
        setLastOpenedAt(new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) + ' at ' + new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }));
        setSelectedCard(null);
        setShowMobileSettings(false);
    }
    function clearResults() {
        setPacks([]);
        setLastOpenedAt(null);
        setSelectedCard(null);
        setShowMobileStats(false);
    }
    function handleCardTouchStart(e: TouchEvent<HTMLDivElement>) {
        const touch = e.changedTouches.item(0);
        if (!touch) return;
        touchStart.current = { x: touch.clientX, y: touch.clientY };
    }
    function handleCardTouchEnd(e: TouchEvent<HTMLDivElement>) {
        if (!selectedCard || !touchStart.current) return;
        const touch = e.changedTouches.item(0);
        if (!touch) return;
        const dx = touch.clientX - touchStart.current.x;
        const dy = touch.clientY - touchStart.current.y;
        touchStart.current = null;

        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 48) {
            navigate(0, dx > 0 ? -1 : 1);
            return;
        }
        if (Math.abs(dy) > 64) {
            navigate(dy > 0 ? -1 : 1, 0);
        }
    }

    // Derived modal nav state
    const currentPack = selectedCard ? packs[selectedCard.packIndex] : null;
    const canPrevCard = selectedCard != null && selectedCard.cardIndex > 0;
    const canNextCard = selectedCard != null && currentPack != null && selectedCard.cardIndex < currentPack.length - 1;
    const canPrevPack = selectedCard != null && selectedCard.packIndex > 0;
    const canNextPack = selectedCard != null && selectedCard.packIndex < packs.length - 1;
    const mobileSettingsPanel = (
        <div className={`${panel} overflow-hidden xl:hidden`}>
            <div className="px-4 py-3 border-b border-slate-700/50 grid gap-2.5">
                <p className={secTitle}>Pack settings</p>
                {packSettings.map(({ label, value, min, max, step, set }) => (
                    <label key={label} className={field}>
                        <span className="text-xs uppercase tracking-wider text-indigo-300/80 font-medium">{label}</span>
                        <input type="number" min={min} max={max} step={step} value={value}
                            onChange={(e) => set(Number(e.target.value) || 0)} className={inp} />
                    </label>
                ))}
            </div>

            <div className="px-4 py-3 border-b border-slate-700/50 grid gap-2.5">
                <p className={secTitle}>Rarity weights</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {rarityOrder.map((rarity) => (
                        <label key={rarity} className={field}>
                            <span className="text-xs uppercase tracking-wider text-indigo-300/80 font-medium capitalize">{formatRarity(rarity)}</span>
                            <input type="number" min={0} step={1} value={rarityWeights[rarity]}
                                onChange={(e) => setWeight(rarity, Number(e.target.value) || 0)} className={inp} />
                        </label>
                    ))}
                </div>
            </div>

            <div className="px-4 py-3 grid gap-2.5">
                <p className={secTitle}>Information</p>
                <ul className="list-none p-0 m-0 grid gap-1.5">
                    {libraryInfo.map(([label, val]) => (
                        <li key={String(label)} className={row}>
                            <span className="text-slate-300">{label}</span>
                            <strong className="text-slate-100">{val}</strong>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );

    return (
        <main className="h-screen overflow-y-auto xl:overflow-hidden">
            <div className="sticky top-0 z-10 px-2 pt-2 pb-3 xl:hidden bg-gradient-to-b from-slate-950 via-slate-950/95 to-transparent">
                <div className={`${panel} p-3`}>
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className={eyebrow}>5e Scroll Pack Opener</p>
                            <div className="text-base font-semibold text-slate-50">Quick controls</div>
                            <p className="text-xs text-slate-400 mt-1 mb-0">{packCount} pack(s) ready · {totalCards} cards in this batch</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowMobileSettings((cur) => !cur)}
                            className="shrink-0 rounded-xl px-3 py-2 bg-white/8 text-slate-200 text-sm font-medium transition-all hover:bg-white/12 border border-slate-700/50"
                        >
                            {showMobileSettings ? 'Hide controls' : 'Controls'}
                        </button>
                    </div>
                    <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                        <button
                            type="button"
                            onClick={openPacks}
                            disabled={packCount === 0 || cardsInPack <= 0}
                            className="rounded-xl px-4 py-3 bg-gradient-to-br from-violet-500 to-blue-500 text-white text-base font-semibold shadow-lg transition-all hover:-translate-y-px hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0 disabled:brightness-100 border-0"
                        >
                            Open {packCount} pack{packCount !== 1 ? 's' : ''}
                        </button>
                        <button
                            type="button"
                            onClick={clearResults}
                            className="rounded-xl px-4 py-2 bg-white/8 text-slate-200 text-sm font-medium transition-all hover:-translate-y-px hover:bg-white/12 border border-slate-700/50"
                        >
                            Clear
                        </button>
                    </div>
                    {lastOpenedAt && <p className="text-xs text-slate-500 mt-2 mb-0">Last batch: {lastOpenedAt}</p>}
                </div>
                {showMobileSettings && <div className="mt-3">{mobileSettingsPanel}</div>}
            </div>

            {/* ── Centered max-width shell ── */}
            <section className="grid min-h-full max-w-screen-3xl mx-auto gap-3 px-2 py-3 md:grid-cols-2 xl:h-full xl:grid-cols-[18rem_minmax(0,1fr)_14rem] xl:px-1 xl:py-0">

                {/* ══ LEFT RAIL ════════════════════════════ */}
                {/* Vertically centered, fixed width, scrollable if content overflows */}
                <aside className="hidden min-w-0 xl:flex xl:flex-col xl:overflow-y-auto xl:py-4">
                    <div className={`${panel} grid gap-0 p-0 overflow-hidden`}>

                        {/* Brand header */}
                        <div className="px-4 pt-4 pb-3 border-b border-slate-700/50">
                            <p className={eyebrow}>5e Scroll Pack Opener</p>
                            <h1 className="text-xl sm:text-2xl font-bold leading-tight mt-1 mb-1 text-slate-50">Pack controls</h1>
                            <p className={`${muted} leading-snug`}>Configure values, then open a batch on the right.</p>
                        </div>

                        {/* ── Action buttons ── moved to top */}
                        <div className="px-4 py-3 border-b border-slate-700/50 grid gap-2">
                            <button
                                type="button"
                                onClick={openPacks}
                                disabled={packCount === 0 || cardsInPack <= 0}
                                className="w-full rounded-xl px-4 py-3 bg-gradient-to-br from-violet-500 to-blue-500 text-white text-base font-semibold shadow-lg transition-all hover:-translate-y-px hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0 disabled:brightness-100 border-0"
                            >
                                Open {packCount} pack{packCount !== 1 ? 's' : ''}
                            </button>
                            <button
                                type="button"
                                onClick={clearResults}
                                className="w-full rounded-xl px-4 py-2 bg-white/8 text-slate-200 text-sm font-medium transition-all hover:-translate-y-px hover:bg-white/12 border border-slate-700/50"
                            >
                                Clear results
                            </button>
                        </div>

                        {/* Pack settings */}
                        <div className="px-4 py-3 border-b border-slate-700/50 grid gap-2.5">
                            <p className={secTitle}>Pack settings</p>
                            {packSettings.map(({ label, value, min, max, step, set }) => (
                                <label key={label} className={field}>
                                    <span className="text-xs uppercase tracking-wider text-indigo-300/80 font-medium">{label}</span>
                                    <input type="number" min={min} max={max} step={step} value={value}
                                        onChange={(e) => set(Number(e.target.value) || 0)} className={inp} />
                                </label>
                            ))}
                        </div>

                        {/* Rarity weights */}
                        <div className="px-4 py-3 border-b border-slate-700/50 grid gap-2.5">
                            <p className={secTitle}>Rarity weights</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {rarityOrder.map((rarity) => (
                                    <label key={rarity} className={field}>
                                        <span className="text-xs uppercase tracking-wider text-indigo-300/80 font-medium capitalize">{formatRarity(rarity)}</span>
                                        <input type="number" min={0} step={1} value={rarityWeights[rarity]}
                                            onChange={(e) => setWeight(rarity, Number(e.target.value) || 0)} className={inp} />
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Info stats */}
                        <div className="px-4 py-3 grid gap-2.5">
                            <p className={secTitle}>Information</p>
                            <ul className="list-none p-0 m-0 grid gap-1.5">
                                {libraryInfo.map(([label, val]) => (
                                    <li key={String(label)} className={row}>
                                        <span className="text-slate-300">{label}</span>
                                        <strong className="text-slate-100">{val}</strong>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </aside>

                {/* ══ CENTER: scrollable spell cards ════════════════════ */}
                <section className="min-w-0 px-0 pb-24 md:col-span-2 xl:col-span-1 xl:overflow-y-auto xl:py-4 xl:px-3 xl:pb-4">
                    <div className="grid gap-3">

                        {/* Spell cards panel */}
                        <div className={`${panel} p-3 sm:p-4 w-full`}>
                            <div className="flex flex-col items-start justify-between gap-1.5 mb-3 sm:flex-row sm:items-center sm:gap-2">
                                <h2 className="text-base font-semibold text-slate-100 mt-0 mb-0">Spell cards</h2>
                                <span className={muted}>{packs.length} pack(s)</span>
                            </div>

                            {packs.length === 0 ? (
                                <div className="border border-dashed border-slate-700/60 rounded-xl p-6 sm:p-8 text-center">
                                    <p className="text-slate-300 font-medium mb-1">No packs opened yet.</p>
                                    <span className="text-slate-500 text-sm">Use the Controls bar to tune the pack, then open it here.</span>
                                </div>
                            ) : (
                                <div className="grid gap-3">
                                    {packs.map((pack, packIndex) => {
                                        const conjCount = pack.filter((e) => e.pool === 'conjuration').length;
                                        return (
                                            <article key={`${packIndex}-${pack.length}`}
                                                className="rounded-xl p-3 bg-slate-950/50 border border-slate-700/40">
                                                <header className="flex flex-col justify-between items-start gap-1.5 mb-3 sm:flex-row sm:items-start sm:gap-2">
                                                    <div>
                                                        <h3 className="text-sm font-semibold text-slate-100 mt-0 mb-0.5">Pack {packIndex + 1}</h3>
                                                        <p className="text-slate-500 text-xs m-0">{conjCount} conjuration · {pack.length - conjCount} staple</p>
                                                    </div>
                                                    <span className="text-xs text-slate-500 shrink-0">{pack.length} cards</span>
                                                </header>

                                                <ol className="list-none p-0 m-0 grid gap-2 grid-cols-1 sm:grid-cols-[repeat(auto-fit,minmax(280px,1fr))]">
                                                    {pack.map((entry, cardIndex) => (
                                                        <li
                                                            key={`${entry.card.id}-${cardIndex}`}
                                                            onClick={() => setSelectedCard({ card: entry.card, pool: entry.pool, isShiny: entry.isShiny, packIndex, cardIndex })}
                                                            className="p-2.5 rounded-xl bg-white/4 border border-slate-700/40 hover:bg-white/8 transition-colors cursor-zoom-in"
                                                        >
                                                            <div className={`grid grid-cols-[5rem_minmax(0,1fr)] gap-3 items-center relative sm:grid-cols-[6rem_minmax(0,1fr)]${entry.isShiny ? ' shiny-card' : ''}`}>
                                                                <img
                                                                    src={entry.card.imageUrl}
                                                                    alt={entry.card.fileName}
                                                                    loading="lazy"
                                                                    className="w-20 h-28 object-contain rounded-lg border border-slate-700/40 bg-slate-950/80 sm:w-24 sm:h-32"
                                                                />
                                                                <div className="min-w-0">
                                                                    <div className="font-semibold text-sm leading-tight text-slate-100 mb-0.5">{entry.card.displayName}</div>
                                                                    <div className="text-xs text-slate-500 mb-2 break-words">{entry.card.fileName}.png</div>
                                                                    <div className="flex flex-wrap gap-1">
                                                                        {entry.isShiny && <span className={shinyTag}>Shiny</span>}
                                                                        <span className={tag}>{entry.card.school}</span>
                                                                        <span className={tag}>Level {entry.card.level}</span>
                                                                        <span className={tag}>{formatRarity(entry.card.rarity)}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                    ))}
                                                </ol>
                                            </article>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* ══ RIGHT RAIL: stats + analysis (vertically centered) ═ */}
                <aside className="hidden min-w-0 xl:grid xl:gap-3 xl:grid-cols-1 xl:col-span-1 xl:overflow-y-auto xl:py-4">

                    {/* Session stats panel */}
                    <section className={`${panel} p-4`}>
                        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-0 mb-3">Session stats</h2>
                        <div className="grid gap-2">
                            {sessionStats.map(({ label, value }) => (
                                <div key={label} className="flex justify-between items-baseline gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-slate-700/50">
                                    <span className={statLabel + ' shrink-0'}>{label}</span>
                                    <strong className="text-sm font-bold text-slate-100 text-right leading-none">{value}</strong>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Rarity breakdown */}
                    <section className={`${panel} p-4`}>
                        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-0 mb-2.5">Rarity</h2>
                        <ul className="list-none p-0 m-0 grid gap-1.5">
                            {rarityOrder.map((rarity) => (
                                <li key={rarity} className={row}>
                                    <span className="text-slate-300 capitalize">{formatRarity(rarity)}</span>
                                    <strong className="text-slate-100">{stats.rarity[rarity] ?? 0}</strong>
                                </li>
                            ))}
                        </ul>
                    </section>

                    {/* Schools breakdown */}
                    <section className={`${panel} p-4`}>
                        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-0 mb-2.5">Schools</h2>
                        <ul className="list-none p-0 m-0 grid gap-1.5">
                            {schoolOrder.map((school) => (
                                <li key={school} className={row}>
                                    <span className="text-slate-300">{school}</span>
                                    <strong className="text-slate-100">{stats.schools[school] ?? 0}</strong>
                                </li>
                            ))}
                        </ul>
                    </section>

                </aside>
            </section>

            <div className="xl:hidden fixed inset-x-2 bottom-2 z-10">
                {showMobileStats && (
                    <div className={`${panel} mb-2 p-3`}>
                        <div className="grid gap-3 sm:grid-cols-3">
                            <section className="grid gap-2">
                                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-0 mb-0">Session stats</h2>
                                {sessionStats.slice(0, 4).map(({ label, value }) => (
                                    <div key={label} className="flex justify-between gap-2 text-xs rounded-lg bg-white/5 border border-slate-700/50 px-3 py-2">
                                        <span className="text-slate-300">{label}</span>
                                        <strong className="text-slate-100">{value}</strong>
                                    </div>
                                ))}
                            </section>
                            <section className="grid gap-2">
                                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-0 mb-0">Rarity</h2>
                                {rarityOrder.map((rarity) => (
                                    <div key={rarity} className="flex justify-between gap-2 text-xs rounded-lg bg-white/5 border border-slate-700/50 px-3 py-2">
                                        <span className="text-slate-300 capitalize">{formatRarity(rarity)}</span>
                                        <strong className="text-slate-100">{stats.rarity[rarity] ?? 0}</strong>
                                    </div>
                                ))}
                            </section>
                            <section className="grid gap-2">
                                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-0 mb-0">Schools</h2>
                                {schoolOrder.slice(0, 5).map((school) => (
                                    <div key={school} className="flex justify-between gap-2 text-xs rounded-lg bg-white/5 border border-slate-700/50 px-3 py-2">
                                        <span className="text-slate-300">{school}</span>
                                        <strong className="text-slate-100">{stats.schools[school] ?? 0}</strong>
                                    </div>
                                ))}
                            </section>
                        </div>
                    </div>
                )}
                <div className={`${panel} px-3 py-2.5`}>
                    <div className="flex items-center gap-3">
                        <div className="grid flex-1 grid-cols-4 gap-2">
                            {[
                                { label: 'Packs', value: packs.length },
                                { label: 'Cards', value: stats.totalOpened },
                                { label: 'Shiny', value: stats.shiny },
                                { label: 'Avg', value: stats.averageLevel },
                            ].map(({ label, value }) => (
                                <div key={label} className="rounded-xl bg-white/5 border border-slate-700/50 px-2 py-2 text-center">
                                    <div className="text-[10px] uppercase tracking-wider text-slate-400">{label}</div>
                                    <div className="text-sm font-semibold text-slate-50">{value}</div>
                                </div>
                            ))}
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowMobileStats((cur) => !cur)}
                            className="shrink-0 rounded-xl px-3 py-2 bg-white/8 text-slate-200 text-sm font-medium transition-all hover:bg-white/12 border border-slate-700/50"
                        >
                            {showMobileStats ? 'Hide' : 'Stats'}
                        </button>
                    </div>
                </div>
            </div>

            {/* ══ MODAL LIGHTBOX ═══════════════════════════ */}
            {selectedCard && (
                <div
                    className="fixed inset-0 bg-slate-950/92 backdrop-blur-md flex items-center justify-center p-4 z-20"
                    onClick={() => setSelectedCard(null)}
                    role="presentation"
                >
                    <div
                        className={`${panel} relative flex flex-col w-full max-w-6xl overflow-hidden`}
                        style={{ maxHeight: 'calc(100vh - 2rem)' }}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="modal-title"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* ── Header bar ── */}
                        <div className="flex flex-wrap items-start justify-between gap-3 px-3 py-3 sm:px-5 border-b border-slate-700/60 shrink-0">
                            {/* Pack navigation */}
                            <div className="flex items-center gap-2 order-1">
                                <button
                                    type="button"
                                    onClick={() => navigate(-1, 0)}
                                    disabled={!canPrevPack}
                                    aria-label="Previous pack"
                                    className="w-7 h-7 rounded-lg grid place-items-center bg-white/8 border border-slate-700/50 text-slate-300 hover:text-white hover:bg-white/15 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm border-0"
                                >
                                    ↑
                                </button>
                                <span className="text-sm font-medium text-slate-200">
                                    Pack <span className="text-white font-bold">{selectedCard.packIndex + 1}</span>
                                    <span className="text-slate-500 mx-1">/</span>
                                    <span className="text-slate-400">{packs.length}</span>
                                </span>
                                <button
                                    type="button"
                                    onClick={() => navigate(1, 0)}
                                    disabled={!canNextPack}
                                    aria-label="Next pack"
                                    className="w-7 h-7 rounded-lg grid place-items-center bg-white/8 border border-slate-700/50 text-slate-300 hover:text-white hover:bg-white/15 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm border-0"
                                >
                                    ↓
                                </button>
                            </div>

                            {/* Card counter */}
                            <span className="text-xs text-slate-500 order-3 basis-full sm:order-2 sm:basis-auto">
                                Card <span className="text-slate-300 font-semibold">{selectedCard.cardIndex + 1}</span>
                                {' '}of <span className="text-slate-300 font-semibold">{currentPack?.length ?? 0}</span>
                                {' '}·{' '}use <kbd className="px-1 py-0.5 rounded bg-slate-800 border border-slate-700 text-xs font-mono">←</kbd>
                                <kbd className="ml-0.5 px-1 py-0.5 rounded bg-slate-800 border border-slate-700 text-xs font-mono">→</kbd>
                                <kbd className="ml-0.5 px-1 py-0.5 rounded bg-slate-800 border border-slate-700 text-xs font-mono">↑</kbd>
                                <kbd className="ml-0.5 px-1 py-0.5 rounded bg-slate-800 border border-slate-700 text-xs font-mono">↓</kbd>
                                {' '}to navigate
                            </span>

                            {/* Close */}
                            <button
                                type="button"
                                onClick={() => setSelectedCard(null)}
                                aria-label="Close"
                                className="w-8 h-8 rounded-xl grid place-items-center bg-slate-800/80 text-slate-300 hover:text-white border border-slate-700/60 text-lg p-0 transition-all hover:bg-slate-700/60 cursor-pointer order-2 sm:order-3"
                            >
                                ×
                            </button>
                        </div>

                        {/* ── Body ── */}
                        <div className="flex flex-col sm:flex-row gap-0 overflow-hidden flex-1 min-h-0">

                            {/* Image area: [‹] [image] [›] as flex columns */}
                            <div
                                className="flex items-stretch sm:w-3/5 min-h-[16rem] sm:min-h-0 bg-slate-950/60 touch-pan-y"
                                onTouchStart={handleCardTouchStart}
                                onTouchEnd={handleCardTouchEnd}
                                onTouchCancel={() => { touchStart.current = null; }}
                            >

                                {/* Prev card button — left column */}
                                <button
                                    type="button"
                                    onClick={() => navigate(0, -1)}
                                    disabled={!canPrevCard}
                                    aria-label="Previous card"
                                    className="w-12 sm:w-14 shrink-0 flex items-center justify-center border-r border-slate-700/50 text-2xl font-bold text-slate-400 hover:text-white hover:bg-white/6 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                                >
                                    ‹
                                </button>

                                {/* Image — centre column */}
                                <div className="relative flex-1 flex items-center justify-center overflow-hidden p-3">
                                    {selectedCard.isShiny && (
                                        <div className="shiny-card absolute inset-0 pointer-events-none" />
                                    )}
                                    <img
                                        src={selectedCard.card.imageUrl}
                                        alt={selectedCard.card.displayName}
                                        className="object-contain max-w-full max-h-full"
                                        style={{ maxHeight: 'calc(100vh - 14rem)' }}
                                    />
                                </div>

                                {/* Next card button — right column */}
                                <button
                                    type="button"
                                    onClick={() => navigate(0, 1)}
                                    disabled={!canNextCard}
                                    aria-label="Next card"
                                    className="w-12 sm:w-14 shrink-0 flex items-center justify-center border-l border-slate-700/50 text-2xl font-bold text-slate-400 hover:text-white hover:bg-white/6 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                                >
                                    ›
                                </button>
                            </div>

                            {/* Metadata panel */}
                            <div className="sm:w-2/5 border-t sm:border-t-0 sm:border-l border-slate-700/60 flex flex-col overflow-y-auto">
                                <div className="p-4 sm:p-6 flex flex-col gap-4 flex-1">
                                    {/* Eyebrow */}
                                    <div>
                                        <p className={eyebrow}>
                                            Pack {selectedCard.packIndex + 1} of {packs.length}
                                            {' · '}
                                            Card {selectedCard.cardIndex + 1} of {currentPack?.length ?? 0}
                                        </p>
                                        <h2 id="modal-title" className="text-xl sm:text-2xl font-bold text-slate-50 mt-1 mb-0 leading-tight">
                                            {selectedCard.card.displayName}
                                        </h2>
                                        <p className="text-slate-500 text-sm mt-1 mb-0 break-words">
                                            {selectedCard.card.fileName}.png
                                        </p>
                                    </div>

                                    {/* Tags */}
                                    <div className="flex flex-wrap gap-2">
                                        {selectedCard.isShiny && <span className={shinyTag}>✦ Shiny</span>}
                                        {[
                                            selectedCard.card.school,
                                            `Level ${selectedCard.card.level}`,
                                            formatRarity(selectedCard.card.rarity),
                                            formatPool(selectedCard.pool),
                                        ].map((item, index) => (
                                            <span key={`${item}-${index}`} className="px-3 py-1 rounded-lg text-sm text-slate-300 bg-white/5 border border-slate-700/50">
                                                {item}
                                            </span>
                                        ))}
                                    </div>

                                    {/* Pack context */}
                                    <div className={`${row} flex-col gap-2 rounded-xl p-3`} style={{ display: 'grid' }}>
                                        <p className={`${secTitle} mb-1`}>Pack context</p>
                                        {currentPack && (() => {
                                            const conjCount = currentPack.filter((e) => e.pool === 'conjuration').length;
                                            return (
                                                <>
                                                    <div className="flex justify-between text-xs">
                                                        <span className="text-slate-400">Pack</span>
                                                        <strong className="text-slate-200">{selectedCard.packIndex + 1} of {packs.length}</strong>
                                                    </div>
                                                    <div className="flex justify-between text-xs">
                                                        <span className="text-slate-400">Card in pack</span>
                                                        <strong className="text-slate-200">{selectedCard.cardIndex + 1} of {currentPack.length}</strong>
                                                    </div>
                                                    <div className="flex justify-between text-xs">
                                                        <span className="text-slate-400">Conjuration</span>
                                                        <strong className="text-slate-200">{conjCount}</strong>
                                                    </div>
                                                    <div className="flex justify-between text-xs">
                                                        <span className="text-slate-400">Staple</span>
                                                        <strong className="text-slate-200">{currentPack.length - conjCount}</strong>
                                                    </div>
                                                </>
                                            );
                                        })()}
                                    </div>

                                    {/* Card navigation buttons */}
                                    <div className="flex flex-col sm:flex-row gap-2 mt-auto pt-2">
                                        <button
                                            type="button"
                                            onClick={() => navigate(0, -1)}
                                            disabled={!canPrevCard}
                                            className="flex-1 rounded-xl py-2.5 bg-white/8 border border-slate-700/50 text-slate-200 text-sm font-medium hover:bg-white/12 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                        >
                                            ‹ Prev card
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => navigate(0, 1)}
                                            disabled={!canNextCard}
                                            className="flex-1 rounded-xl py-2.5 bg-white/8 border border-slate-700/50 text-slate-200 text-sm font-medium hover:bg-white/12 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                        >
                                            Next card ›
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
