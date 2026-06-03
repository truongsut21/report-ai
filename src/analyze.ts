import 'dotenv/config';
import * as cheerio from 'cheerio';
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import type { ArticleAnalysis } from './analyzer-types.js';
import {
  extractMeta,
  extractOutline,
  parseSections,
  extractImages,
  extractTables,
  extractLinks,
  calculateStats,
} from './parser.js';

// ===== Config =====
const POST_URL = process.env.POST_URL;

if (!POST_URL) {
  console.error('❌ POST_URL is not set in .env');
  console.error('   Add POST_URL=https://vietnix.vn/your-post-slug/ to your .env file');
  process.exit(1);
}

// ===== Exported function for pipeline =====
export async function analyzePost(url?: string): Promise<ArticleAnalysis> {
  const postUrl = url || POST_URL;
  if (!postUrl) {
    throw new Error('POST_URL is not set in .env');
  }

  console.log('🔍 Blog Post Analyzer');
  console.log('━'.repeat(50));
  console.log(`📄 URL: ${postUrl}`);
  console.log('');

  // Step 1: Launch browser & fetch HTML with Playwright
  console.log('⏳ Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    locale: 'vi-VN',
    extraHTTPHeaders: {
      'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
    },
  });

  const page = await context.newPage();

  console.log('⏳ Navigating to page...');
  try {
    await page.goto(postUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('.post_content', { timeout: 10000 }).catch(() => {
      console.log('⚠️  .post_content not found via waitForSelector, proceeding with current HTML...');
    });
  } catch (err) {
    await browser.close();
    throw new Error(`Failed to load page: ${err}`);
  }

  const html = await page.content();
  await browser.close();
  console.log(`✅ Fetched ${(html.length / 1024).toFixed(1)} KB of HTML via Playwright`);

  // Step 2: Parse with Cheerio
  console.log('⏳ Parsing HTML with Cheerio...');
  const $ = cheerio.load(html);

  // Step 3: Find .post_content
  const $postContent = $('.post_content');
  if ($postContent.length === 0) {
    throw new Error('Could not find .post_content element');
  }
  console.log('✅ Found .post_content element');

  // Step 4: Extract title (h1)
  const title = $postContent.find('h1').first().text().trim() ||
                $('title').text().trim() ||
                'Untitled';
  console.log(`📌 Title: ${title}`);

  // Step 5: Extract all data
  console.log('⏳ Extracting content...');

  const meta = extractMeta($);
  const outline = extractOutline($, $postContent);
  const sections = parseSections($, $postContent);
  const images = extractImages($, $postContent);
  const tables = extractTables($, $postContent);
  const links = extractLinks($, $postContent, postUrl);
  const stats = calculateStats(sections, images, tables, links, outline);

  const analysis: ArticleAnalysis = {
    url: postUrl,
    title,
    meta,
    outline,
    sections,
    images,
    tables,
    links,
    stats,
  };

  // Save to file
  const outputDir = resolve(process.cwd(), 'output');
  mkdirSync(outputDir, { recursive: true });
  const outputPath = resolve(outputDir, 'analysis.json');
  writeFileSync(outputPath, JSON.stringify(analysis, null, 2), 'utf-8');

  // Print summary
  console.log('');
  console.log('✅ Analysis complete!');
  console.log('━'.repeat(50));
  console.log(`📌 Title: ${title}`);
  console.log(`👤 Author: ${meta.author || 'N/A'}`);
  console.log(`📅 Date: ${meta.publishDate || 'N/A'}`);
  console.log(`👁️  Views: ${meta.views || 'N/A'}`);
  console.log(`⭐ Rating: ${meta.rating || 'N/A'}`);
  console.log(`📊 Words: ${stats.wordCount.toLocaleString()} | Images: ${stats.imageCount} | H2: ${stats.headingCount.h2}`);
  console.log(`💾 Saved to: ${outputPath}`);

  return analysis;
}

// Run standalone
if (process.argv[1]?.includes('analyze.ts')) {
  analyzePost().catch((err) => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
}
