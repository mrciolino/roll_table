export function randomInt(maxExclusive: number): number {
    return Math.floor(Math.random() * maxExclusive);
}

/**
 * Picks a random item from a collection based on weighted probabilities.
 * 
 * @template T - The type of items in the collection.
 * @param items - The readonly array of items to pick from.
 * @param getWeight - A function that returns the weight for each item. Negative weights are treated as 0.
 * @returns A randomly selected item from the collection, weighted by the values returned from `getWeight`.
 *          If all weights are <= 0, returns a uniformly random item. Falls back to the last item if no item is selected.
 * 
 * @example
 * ```typescript
 * const items = ['a', 'b', 'c'];
 * const weights = { a: 1, b: 2, c: 3 };
 * const result = weightedPick(items, item => weights[item]);
 * // 'c' has a 50% chance, 'b' has a 33% chance, 'a' has a 16% chance
 * ```
 */
export function weightedPick<T>(items: readonly T[], getWeight: (item: T) => number): T {
    const total = items.reduce((sum, item) => sum + Math.max(0, getWeight(item)), 0);
    if (total <= 0) {
        return items[randomInt(items.length)];
    }

    let roll = Math.random() * total;
    for (const item of items) {
        roll -= Math.max(0, getWeight(item));
        if (roll <= 0) {
            return item;
        }
    }

    return items[items.length - 1];
}

export function pickOne<T>(items: readonly T[]): T {
    return items[randomInt(items.length)];
}
