// ============================================================
// Vietnamese Text Preprocessor for TTS
// Maps English/tech terms to phonetic Vietnamese for accurate pronunciation
// ============================================================

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

/** Built-in pronunciation map for common tech terms */
const BUILTIN_MAP: Record<string, string> = {
  'vietnix': 'việt nít',
  'devzone': 'đèv zôn',
  'deploy': 'đi ploi',
  'CI/CD': 'xi ai xi đi',
  'API': 'ây pi ai',
  'frontend': 'phờ ren en',
  'backend': 'bách en',
  'refactor': 'ri phác tơ',
  'merge': 'mơ dz',
  'PR': 'pi a',
  'bug': 'bấc',
  'debug': 'đi bấc',
  'VPS': 'vi pi ét',
  'docker': 'đóc cơ',
  'nginx': 'en gin éc',
};

/** Load custom pronunciation from pronunciation.json */
function loadCustomPronunciation(): Record<string, string> {
  const filePath = resolve(process.cwd(), 'pronunciation.json');
  if (!existsSync(filePath)) return {};

  try {
    const content = readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as Record<string, string>;
  } catch (err) {
    console.warn('⚠️ Failed to load pronunciation.json:', (err as Error).message);
    return {};
  }
}

/** Merged pronunciation map (custom overrides built-in) */
let mergedMap: Record<string, string> | null = null;

function getPronunciationMap(): Record<string, string> {
  if (!mergedMap) {
    const custom = loadCustomPronunciation();
    mergedMap = { ...BUILTIN_MAP, ...custom };
  }
  return mergedMap;
}

/**
 * Preprocess Vietnamese text for TTS
 * Replaces English/tech terms with phonetic Vietnamese equivalents
 */
export function preprocessVietnamese(text: string): string {
  const map = getPronunciationMap();
  let result = text;

  // Sort keys by length (longest first) to avoid partial replacements
  const sortedKeys = Object.keys(map).sort((a, b) => b.length - a.length);

  for (const key of sortedKeys) {
    const value = map[key];
    // Case-insensitive word boundary replacement
    const regex = new RegExp(`\\b${escapeRegex(key)}\\b`, 'gi');
    result = result.replace(regex, value);
  }

  // Handle version numbers: v2.1.0 → "phiên bản 2 chấm 1 chấm 0"
  result = result.replace(/\bv?(\d+)\.(\d+)\.(\d+)\b/g, (_, major, minor, patch) => {
    return `phiên bản ${major} chấm ${minor} chấm ${patch}`;
  });

  // Handle percentages: 20% → "20 phần trăm"
  result = result.replace(/(\d+)%/g, '$1 phần trăm');

  // Handle URLs: remove for TTS (they sound terrible when read aloud)
  result = result.replace(/https?:\/\/\S+/g, '');

  // Handle email: user@domain → "user at domain"
  result = result.replace(/(\w+)@(\w+\.\w+)/g, '$1 ét $2');

  // Clean up multiple spaces
  result = result.replace(/\s+/g, ' ').trim();

  return result;
}

/**
 * Escape special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&');
}

/**
 * Reset the cached map (useful for testing)
 */
export function resetPronunciationCache(): void {
  mergedMap = null;
}

// Run standalone for testing
if (process.argv[1]?.endsWith('vietnamese-preprocessor.ts')) {
  const testTexts = [
    'Hoàn thiện logic xử lý Web Automation sử dụng Playwright trên Headless VPS',
    'Deploy ứng dụng lên Docker container với CI/CD pipeline',
    'Refactor module quản lý Cookies, tối ưu storageState cho Vietnix',
    'API endpoint đã fix bug v2.1.0, performance tăng 20%',
    'Debug JWT token trong backend, check https://api.vietnix.dev',
  ];

  console.log('🗣️ Vietnamese TTS Preprocessor Test:\n');
  for (const text of testTexts) {
    console.log(`📝 Input:  ${text}`);
    console.log(`🔊 Output: ${preprocessVietnamese(text)}`);
    console.log('---');
  }
}
