"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPodcastEpisodes = getPodcastEpisodes;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const PODCAST_RSS_PATH = path_1.default.join(process.cwd(), 'public', 'podcast.rss');
function decodeEntities(input) {
    return input
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .trim();
}
function extractTag(block, tag) {
    const match = block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i'));
    return match ? decodeEntities(match[1]) : '';
}
function extractEnclosure(block) {
    const match = block.match(/<enclosure[^>]*url="([^"]+)"[^>]*type="([^"]+)"[^>]*\/>/i);
    if (!match) {
        return { url: '', type: 'audio/mpeg' };
    }
    return { url: decodeEntities(match[1]), type: decodeEntities(match[2]) };
}
function getPodcastEpisodes(limit) {
    if (!fs_1.default.existsSync(PODCAST_RSS_PATH)) {
        return [];
    }
    const xml = fs_1.default.readFileSync(PODCAST_RSS_PATH, 'utf8');
    const items = xml.match(/<item>[\s\S]*?<\/item>/gi) || [];
    const episodes = items.map((block) => {
        const title = extractTag(block, 'title');
        const description = extractTag(block, 'description');
        const guid = extractTag(block, 'guid');
        const pubDate = extractTag(block, 'pubDate');
        const enclosure = extractEnclosure(block);
        return {
            title,
            description,
            guid,
            pubDate,
            audioUrl: enclosure.url,
            mimeType: enclosure.type,
        };
    });
    episodes.sort((a, b) => {
        const aTime = Date.parse(a.pubDate) || 0;
        const bTime = Date.parse(b.pubDate) || 0;
        return bTime - aTime;
    });
    if (limit && limit > 0) {
        return episodes.slice(0, limit);
    }
    return episodes;
}
//# sourceMappingURL=podcast.js.map