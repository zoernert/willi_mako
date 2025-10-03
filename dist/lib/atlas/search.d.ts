import type { AtlasSearchItem } from './types';
interface SearchOptions {
    limit?: number;
}
export declare const createAtlasSearch: (items: AtlasSearchItem[]) => {
    search: (rawQuery: string, options?: SearchOptions) => {
        item: AtlasSearchItem;
        score: number;
    }[];
};
export {};
//# sourceMappingURL=search.d.ts.map