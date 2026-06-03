import * as cheerio from 'cheerio';
import type {
  ContentBlock,
  ContentSection,
  ImageInfo,
  TableInfo,
  LinkInfo,
  OutlineItem,
  ArticleMeta,
  ArticleStats,
  ParagraphData,
  ListData,
  TableData,
  ImageData,
  CodeData,
  BlockquoteData,
  FeaturedSnippetData,
  HeadingData,
} from './analyzer-types.js';

type CheerioAPI = ReturnType<typeof cheerio.load>;
type CheerioElement = cheerio.Element;

// ===== Utility helpers =====

/**
 * Get the real image src, preferring data-src (lazy-loaded) over src.
 */
function getImageSrc(el: cheerio.Cheerio<CheerioElement>): string {
  return el.attr('data-src') || el.attr('src') || '';
}

/**
 * Clean up text: collapse whitespace, trim.
 */
function cleanText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Check if an element is a heading (h1-h6).
 */
function isHeading(tagName: string): boolean {
  return /^h[1-6]$/i.test(tagName);
}

/**
 * Get heading level from tag name.
 */
function headingLevel(tagName: string): number {
  return parseInt(tagName.replace(/^h/i, ''), 10);
}

// ===== Meta extraction =====

export function extractMeta($: CheerioAPI): ArticleMeta {
  // Breadcrumb from rank-math
  const breadcrumb: string[] = [];
  $('.rank-math-breadcrumb a, .rank-math-breadcrumb .last').each((_, el) => {
    const text = cleanText($(el).text());
    if (text) breadcrumb.push(text);
  });

  // Author
  const author = cleanText($('[class*="brxe-heading"] a[href*="/author/"]').first().text()) || undefined;

  // Publish date - look for date patterns in brxe-heading spans
  let publishDate: string | undefined;
  $('span.brxe-heading').each((_, el) => {
    const text = cleanText($(el).text());
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(text)) {
      publishDate = text;
    }
  });

  // Views
  const views = cleanText($('.post-views-count').first().text()) || undefined;

  // Rating
  const ratingEl = $('.kksr-legend').first();
  const rating = ratingEl.length ? cleanText(ratingEl.text()) : undefined;

  return { author, publishDate, views, rating, breadcrumb };
}

// ===== Outline (TOC) extraction =====

export function extractOutline($: CheerioAPI, $postContent: cheerio.Cheerio<CheerioElement>): OutlineItem[] {
  const outline: OutlineItem[] = [];

  $postContent.find('h1, h2, h3, h4').each((_, el) => {
    const $el = $(el);
    const tagName = (el as cheerio.Element).tagName?.toLowerCase() || '';
    if (!isHeading(tagName)) return;

    const text = cleanText($el.text());
    const id = $el.attr('id') || '';
    if (!text) return;

    outline.push({
      level: headingLevel(tagName),
      text,
      id,
    });
  });

  return outline;
}

// ===== Content block parsers =====

function parseParagraph($: CheerioAPI, $el: cheerio.Cheerio<CheerioElement>): ContentBlock {
  const data: ParagraphData = {
    text: cleanText($el.text()),
    html: $el.html()?.trim() || '',
  };
  return { type: 'paragraph', data };
}

function parseList($: CheerioAPI, $el: cheerio.Cheerio<CheerioElement>): ContentBlock {
  const ordered = $el.is('ol');
  const items: string[] = [];
  $el.find('> li').each((_, li) => {
    items.push(cleanText($(li).text()));
  });
  const data: ListData = { ordered, items };
  return { type: 'list', data };
}

function parseTable($: CheerioAPI, $el: cheerio.Cheerio<CheerioElement>): ContentBlock {
  const headers: string[] = [];
  const rows: string[][] = [];

  // Extract headers
  $el.find('thead th, thead td').each((_, th) => {
    headers.push(cleanText($(th).text()));
  });

  // If no thead, try first row
  if (headers.length === 0) {
    const $firstRow = $el.find('tr').first();
    $firstRow.find('th, td').each((_, cell) => {
      headers.push(cleanText($(cell).text()));
    });
  }

  // Extract body rows
  const $bodyRows = $el.find('tbody tr');
  const rowSelector = $bodyRows.length > 0 ? $bodyRows : $el.find('tr').slice(headers.length > 0 ? 1 : 0);

  rowSelector.each((_, tr) => {
    const row: string[] = [];
    $(tr).find('td, th').each((__, cell) => {
      row.push(cleanText($(cell).text()));
    });
    if (row.length > 0) rows.push(row);
  });

  const data: TableData = { headers, rows };
  return { type: 'table', data };
}

function parseImage($: CheerioAPI, $el: cheerio.Cheerio<CheerioElement>): ContentBlock {
  // Handle <figure> with <img> inside
  let $img = $el;
  if ($el.is('figure')) {
    $img = $el.find('img').first();
  }

  const src = getImageSrc($img);
  const alt = $img.attr('alt') || '';
  const width = $img.attr('width') || undefined;
  const height = $img.attr('height') || undefined;

  // Caption from figcaption
  let caption: string | undefined;
  if ($el.is('figure')) {
    const $caption = $el.find('figcaption');
    if ($caption.length) {
      caption = cleanText($caption.text());
    }
  }

  // Skip placeholder/base64 images
  if (src.startsWith('data:image/svg+xml')) {
    const realSrc = $img.attr('data-src') || '';
    if (!realSrc) return { type: 'image', data: { src: '', alt, caption } as ImageData };
    const data: ImageData = { src: realSrc, alt, caption, width, height };
    return { type: 'image', data };
  }

  const data: ImageData = { src, alt, caption, width, height };
  return { type: 'image', data };
}

function parseCode($: CheerioAPI, $el: cheerio.Cheerio<CheerioElement>): ContentBlock {
  let code = '';
  let language: string | undefined;

  if ($el.is('pre')) {
    const $code = $el.find('code');
    if ($code.length) {
      code = $code.text();
      // Try to extract language from class
      const codeClass = $code.attr('class') || '';
      const langMatch = codeClass.match(/language-(\w+)/);
      if (langMatch) language = langMatch[1];
    } else {
      code = $el.text();
    }
  } else {
    code = $el.text();
  }

  const data: CodeData = { language, code: code.trim() };
  return { type: 'code', data };
}

function parseBlockquote($: CheerioAPI, $el: cheerio.Cheerio<CheerioElement>): ContentBlock {
  const data: BlockquoteData = { text: cleanText($el.text()) };
  return { type: 'blockquote', data };
}

function parseFeaturedSnippet($: CheerioAPI, $el: cheerio.Cheerio<CheerioElement>): ContentBlock {
  const title = cleanText($el.find('h2').first().text());
  const items: { text: string; href?: string }[] = [];

  $el.find('li').each((_, li) => {
    const $li = $(li);
    const $a = $li.find('a').first();
    if ($a.length) {
      items.push({ text: cleanText($a.text()), href: $a.attr('href') || undefined });
    } else {
      items.push({ text: cleanText($li.text()) });
    }
  });

  const data: FeaturedSnippetData = { title, items };
  return { type: 'featured-snippet', data };
}

// ===== Section builder =====

/**
 * Parse all direct content elements within .post_content, grouping them by heading.
 */
export function parseSections($: CheerioAPI, $postContent: cheerio.Cheerio<CheerioElement>): ContentSection[] {
  const sections: ContentSection[] = [];
  let currentSection: ContentSection = {
    heading: '(intro)',
    level: 0,
    id: '',
    content: [],
  };

  // Walk through all top-level children of #ftwp-postcontent (the actual content wrapper)
  const $content = $postContent.find('#ftwp-postcontent');
  const $target = $content.length > 0 ? $content : $postContent;

  $target.children().each((_, el) => {
    const $el = $(el);
    const tagName = (el as cheerio.Element).tagName?.toLowerCase() || '';

    // Skip noscript, script, style
    if (['noscript', 'script', 'style'].includes(tagName)) return;

    // Featured snippet block
    if ($el.hasClass('wp-block-vnx-featured-snippet')) {
      currentSection.content.push(parseFeaturedSnippet($, $el));
      return;
    }

    // Bricks section (may contain headings + content)
    if ($el.hasClass('brxe-section') || (tagName === 'section' && $el.find('.brxe-container').length > 0)) {
      // Recursively parse section content
      const innerBlocks = parseInnerContent($, $el);
      currentSection.content.push(...innerBlocks);
      return;
    }

    // Heading → start new section
    if (isHeading(tagName)) {
      const level = headingLevel(tagName);
      // Only split on h2+ (h1 is title)
      if (level >= 2) {
        // Save previous section if it has content
        if (currentSection.content.length > 0 || currentSection.heading !== '(intro)') {
          sections.push(currentSection);
        }
        currentSection = {
          heading: cleanText($el.text()),
          level,
          id: $el.attr('id') || '',
          content: [],
        };
        return;
      } else {
        // h1 - just add as heading block
        const data: HeadingData = {
          level: 1,
          text: cleanText($el.text()),
          id: $el.attr('id') || '',
        };
        currentSection.content.push({ type: 'heading', data });
        return;
      }
    }

    // Parse based on tag
    const block = parseElement($, $el, tagName);
    if (block) {
      currentSection.content.push(block);
    }
  });

  // Push last section
  if (currentSection.content.length > 0) {
    sections.push(currentSection);
  }

  return sections;
}

/**
 * Parse a single element into a ContentBlock.
 */
function parseElement($: CheerioAPI, $el: cheerio.Cheerio<CheerioElement>, tagName: string): ContentBlock | null {
  switch (tagName) {
    case 'p':
      const text = cleanText($el.text());
      if (!text) return null;
      return parseParagraph($, $el);

    case 'ul':
    case 'ol':
      return parseList($, $el);

    case 'table':
      return parseTable($, $el);

    case 'figure':
      if ($el.find('table').length > 0) {
        return parseTable($, $el.find('table').first());
      }
      if ($el.find('img').length > 0) {
        return parseImage($, $el);
      }
      return null;

    case 'img':
      return parseImage($, $el);

    case 'pre':
      return parseCode($, $el);

    case 'code':
      return parseCode($, $el);

    case 'blockquote':
      return parseBlockquote($, $el);

    case 'div':
      // Handle special div-based blocks
      if ($el.hasClass('wp-block-vnx-featured-snippet')) {
        return parseFeaturedSnippet($, $el);
      }
      // Recursively check for content inside generic divs
      const innerBlocks = parseInnerContent($, $el);
      if (innerBlocks.length === 1) return innerBlocks[0];
      if (innerBlocks.length > 1) {
        // Return first meaningful block for simple cases
        return innerBlocks[0];
      }
      return null;

    default:
      return null;
  }
}

/**
 * Recursively parse inner content of a container element.
 */
function parseInnerContent($: CheerioAPI, $container: cheerio.Cheerio<CheerioElement>): ContentBlock[] {
  const blocks: ContentBlock[] = [];

  $container.children().each((_, el) => {
    const $el = $(el);
    const tagName = (el as cheerio.Element).tagName?.toLowerCase() || '';

    if (['noscript', 'script', 'style'].includes(tagName)) return;

    if (isHeading(tagName)) {
      const data: HeadingData = {
        level: headingLevel(tagName),
        text: cleanText($el.text()),
        id: $el.attr('id') || '',
      };
      blocks.push({ type: 'heading', data });
      return;
    }

    const block = parseElement($, $el, tagName);
    if (block) blocks.push(block);
  });

  return blocks;
}

// ===== Aggregate extractors =====

export function extractImages($: CheerioAPI, $postContent: cheerio.Cheerio<CheerioElement>): ImageInfo[] {
  const images: ImageInfo[] = [];
  const seen = new Set<string>();

  $postContent.find('img').each((_, el) => {
    const $img = $(el);
    const src = getImageSrc($img);

    // Skip base64 placeholders without real data-src
    if (!src || src.startsWith('data:')) return;
    // Deduplicate
    if (seen.has(src)) return;
    seen.add(src);

    const alt = $img.attr('alt') || '';
    let caption: string | undefined;
    const $figure = $img.closest('figure');
    if ($figure.length) {
      const $cap = $figure.find('figcaption');
      if ($cap.length) caption = cleanText($cap.text());
    }

    images.push({ src, alt, caption });
  });

  return images;
}

export function extractTables($: CheerioAPI, $postContent: cheerio.Cheerio<CheerioElement>): TableInfo[] {
  const tables: TableInfo[] = [];

  $postContent.find('table').each((_, el) => {
    const $table = $(el);
    const block = parseTable($, $table);
    const data = block.data as TableData;

    // Find nearest heading for context
    let context: string | undefined;
    const $prev = $table.closest('section, div').prevAll('h2, h3').first();
    if ($prev.length) context = cleanText($prev.text());

    tables.push({ ...data, context });
  });

  return tables;
}

export function extractLinks($: CheerioAPI, $postContent: cheerio.Cheerio<CheerioElement>, baseUrl: string): LinkInfo[] {
  const links: LinkInfo[] = [];
  const seen = new Set<string>();
  const baseDomain = new URL(baseUrl).hostname;

  $postContent.find('a[href]').each((_, el) => {
    const $a = $(el);
    const href = $a.attr('href') || '';
    const text = cleanText($a.text());

    if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;
    if (!text) return;

    const key = `${href}|${text}`;
    if (seen.has(key)) return;
    seen.add(key);

    let type: 'internal' | 'external' = 'external';
    try {
      const linkDomain = new URL(href, baseUrl).hostname;
      if (linkDomain === baseDomain || linkDomain.endsWith(`.${baseDomain}`)) {
        type = 'internal';
      }
    } catch {
      type = 'internal'; // relative URLs
    }

    links.push({ href, text, type });
  });

  return links;
}

// ===== Stats calculator =====

export function calculateStats(
  sections: ContentSection[],
  images: ImageInfo[],
  tables: TableInfo[],
  links: LinkInfo[],
  outline: OutlineItem[],
): ArticleStats {
  let wordCount = 0;
  let paragraphCount = 0;
  let listCount = 0;

  for (const section of sections) {
    for (const block of section.content) {
      if (block.type === 'paragraph') {
        paragraphCount++;
        const data = block.data as ParagraphData;
        wordCount += data.text.split(/\s+/).filter(Boolean).length;
      } else if (block.type === 'list') {
        listCount++;
        const data = block.data as ListData;
        for (const item of data.items) {
          wordCount += item.split(/\s+/).filter(Boolean).length;
        }
      } else if (block.type === 'featured-snippet') {
        const data = block.data as FeaturedSnippetData;
        wordCount += data.title.split(/\s+/).filter(Boolean).length;
        for (const item of data.items) {
          wordCount += item.text.split(/\s+/).filter(Boolean).length;
        }
      }
    }
  }

  const headingCount = { h1: 0, h2: 0, h3: 0, h4: 0 };
  for (const item of outline) {
    const key = `h${item.level}` as keyof typeof headingCount;
    if (key in headingCount) headingCount[key]++;
  }

  const internalLinks = links.filter((l) => l.type === 'internal').length;
  const externalLinks = links.filter((l) => l.type === 'external').length;

  return {
    wordCount,
    paragraphCount,
    headingCount,
    imageCount: images.length,
    tableCount: tables.length,
    listCount,
    linkCount: { internal: internalLinks, external: externalLinks },
  };
}
