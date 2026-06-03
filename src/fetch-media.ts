// ============================================================
// Stock Media Integration - Pexels API for images/videos
// ============================================================

import 'dotenv/config';
import { createClient } from 'pexels';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve } from 'path';
import type { StockMedia, VideoScript } from './types.js';

const PEXELS_KEY = process.env.PEXELS_API_KEY || '';
const ASSETS_DIR = resolve(process.cwd(), 'assets');

/**
 * Fetch stock images and videos for all script sections
 */
export async function fetchAllMedia(script: VideoScript): Promise<StockMedia[]> {
  if (!PEXELS_KEY) {
    console.warn('⚠️ No PEXELS_API_KEY set, using gradient backgrounds');
    return [];
  }

  console.log('🖼️ Fetching stock media from Pexels...');
  const client = createClient(PEXELS_KEY);
  const media: StockMedia[] = [];

  // Fetch intro background video/image
  const introKeywords = script.intro.keywords || ['technology', 'abstract', 'dark'];
  const introMedia = await searchAndDownload(client, introKeywords.join(' '), 'intro', 'image');
  if (introMedia) media.push(introMedia);

  // Fetch image for each section
  for (let i = 0; i < script.sections.length; i++) {
    const section = script.sections[i];
    const keywords = section.keywords || section.highlights?.slice(0, 3) || ['technology'];
    const sectionMedia = await searchAndDownload(client, keywords.join(' '), `section-${i + 1}`, 'image');
    if (sectionMedia) media.push(sectionMedia);
  }

  // Fetch summary background
  const summaryKeywords = script.summary.keywords || ['dashboard', 'analytics'];
  const summaryMedia = await searchAndDownload(client, summaryKeywords.join(' '), 'summary', 'image');
  if (summaryMedia) media.push(summaryMedia);

  console.log(`✅ Downloaded ${media.length} media assets`);
  return media;
}

/**
 * Search Pexels and download the best result
 */
async function searchAndDownload(
  client: ReturnType<typeof createClient>,
  query: string,
  sectionId: string,
  type: 'image' | 'video'
): Promise<StockMedia | null> {
  try {
    const dir = resolve(ASSETS_DIR, 'images', sectionId);
    mkdirSync(dir, { recursive: true });

    // Enhance query for better results
    const enhancedQuery = `${query} dark technology`;

    if (type === 'image') {
      const result = await client.photos.search({
        query: enhancedQuery,
        per_page: 3,
        orientation: 'landscape',
        size: 'medium',
      });

      if ('photos' in result && result.photos.length > 0) {
        const photo = result.photos[0];
        const imageUrl = photo.src.large2x || photo.src.large || photo.src.original;
        const localPath = resolve(dir, `bg.jpg`);

        // Download image
        const response = await fetch(imageUrl);
        const buffer = Buffer.from(await response.arrayBuffer());
        writeFileSync(localPath, buffer);

        console.log(`  📷 [${sectionId}] "${query}" → ${photo.photographer}`);

        return {
          type: 'image',
          url: imageUrl,
          localPath,
          source: 'pexels',
          photographer: photo.photographer,
          query,
          width: photo.width,
          height: photo.height,
        };
      }
    }

    console.log(`  ⚠️ [${sectionId}] No results for "${query}"`);
    return null;
  } catch (err) {
    console.warn(`  ⚠️ [${sectionId}] Media fetch failed: ${(err as Error).message}`);
    return null;
  }
}

// Run standalone
if (process.argv[1]?.endsWith('fetch-media.ts')) {
  console.log('🖼️ Testing media fetch...');
  const testScript: VideoScript = {
    intro: { text: '', duration: 8, keywords: ['technology', 'abstract'] },
    sections: [{ title: 'Test', narration: '', highlights: ['AI', 'automation'], duration: 12, keywords: ['programming', 'laptop'] }],
    summary: { text: '', duration: 8, keywords: ['dashboard', 'analytics'] },
    closing: { text: '', duration: 5 },
    totalDuration: 33, generatedAt: '', tone: 'review',
  };
  const media = await fetchAllMedia(testScript);
  console.log(JSON.stringify(media, null, 2));
}
