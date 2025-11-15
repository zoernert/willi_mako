import fs from 'fs';
import path from 'path';

export interface PodcastEpisode {
  title: string;
  description: string;
  audioUrl: string;
  guid: string;
  pubDate: string;
  mimeType: string;
}

const PODCAST_RSS_PATH = path.join(process.cwd(), 'public', 'podcast.rss');

function decodeEntities(input: string): string {
  return input
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

function extractTag(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match ? decodeEntities(match[1]) : '';
}

function extractEnclosure(block: string): { url: string; type: string } {
  const match = block.match(/<enclosure[^>]*url="([^"]+)"[^>]*type="([^"]+)"[^>]*\/>/i);
  if (!match) {
    return { url: '', type: 'audio/mpeg' };
  }
  return { url: decodeEntities(match[1]), type: decodeEntities(match[2]) };
}

export function getPodcastEpisodes(limit?: number): PodcastEpisode[] {
  if (!fs.existsSync(PODCAST_RSS_PATH)) {
    return [];
  }

  const xml = fs.readFileSync(PODCAST_RSS_PATH, 'utf8');
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
    } as PodcastEpisode;
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
