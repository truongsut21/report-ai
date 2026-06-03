// ============================================================
// Main Pipeline Orchestrator
// Runs the full blog post → video generation pipeline
// ============================================================

import 'dotenv/config';
import { analyzePost } from './analyze.js';
import { generateScript } from './generate-script.js';
import { generateAllAudio, updateScriptTimings } from './generate-audio.js';
import { fetchAllMedia } from './fetch-media.js';
import { composeVideo } from './compose-video.js';
import { previewVideo, renderVideo } from './render-video.js';
import type { ScriptTone, CLIOptions } from './types.js';

/**
 * Parse CLI arguments
 */
function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);

  const getArg = (flag: string): string | undefined => {
    const idx = args.indexOf(flag);
    return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : undefined;
  };

  return {
    preview: args.includes('--preview'),
    render: args.includes('--render'),
    output: getArg('--output') || '',
    voice: getArg('--voice') || process.env.TTS_VOICE || 'Puck',
    style: getArg('--style') || '',
    tone: (getArg('--tone') as ScriptTone) || (process.env.SCRIPT_TONE as ScriptTone) || 'review',
    noMedia: args.includes('--no-media'),
    noSfx: args.includes('--no-sfx'),
    noCache: args.includes('--no-cache'),
  };
}

/**
 * Main pipeline
 */
async function main(): Promise<void> {
  const options = parseArgs();
  const startTime = Date.now();

  console.log('');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║   🔍 Blog Post → Video Generator                ║');
  console.log('║   Powered by Cheerio + Gemini + HyperFrames     ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('');

  try {
    // ── Step 1: Analyze Blog Post ────────────────────
    console.log('━━━ Step 1/6: Analyze Blog Post ━━━');
    const analysis = await analyzePost();
    console.log('');

    // ── Step 2: Generate Script ──────────────────────
    console.log('━━━ Step 2/6: Generate Script ━━━');
    let script = await generateScript(analysis, options.tone);
    script.articleStats = {
      wordCount: analysis.stats.wordCount,
      imageCount: analysis.stats.imageCount,
      headingCount: analysis.stats.headingCount.h2,
      linkCount: analysis.stats.linkCount.internal + analysis.stats.linkCount.external,
    };
    console.log('');

    // ── Step 3: Fetch Stock Media ────────────────────
    console.log('━━━ Step 3/6: Fetch Media ━━━');
    const media = options.noMedia ? [] : await fetchAllMedia(script);
    console.log('');

    // ── Step 4: Generate TTS Audio ───────────────────
    console.log('━━━ Step 4/6: Generate Audio (TTS) ━━━');
    const audioFiles = await generateAllAudio(script);
    script = updateScriptTimings(script, audioFiles);
    console.log('');

    // ── Step 5: Compose Video ────────────────────────
    console.log('━━━ Step 5/6: Compose Video ━━━');
    composeVideo(script, audioFiles, media);
    console.log('');

    // ── Step 6: Preview or Render ────────────────────
    if (options.preview) {
      console.log('━━━ Step 6/6: Preview ━━━');
      previewVideo();
    } else if (options.render) {
      console.log('━━━ Step 6/6: Render MP4 ━━━');
      const outputPath = renderVideo(options.output || undefined);
      console.log(`\n📁 Output: ${outputPath}`);
    } else {
      console.log('━━━ Step 6/6: Done ━━━');
      console.log('💡 Composition ready! Use:');
      console.log('   npm run preview   → Preview in browser');
      console.log('   npm run render    → Export MP4');
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('');
    console.log(`✅ Pipeline completed in ${elapsed}s`);
    console.log(`📄 Article: ${analysis.title}`);
    console.log(`📊 Script: ${script.sections.length} sections, ${script.totalDuration.toFixed(1)}s total`);
    console.log(`🎧 Audio: ${audioFiles.length} files`);
    console.log(`🖼️ Media: ${media.length} assets`);

  } catch (err) {
    console.error('\n❌ Pipeline failed:', (err as Error).message);
    console.error((err as Error).stack);
    process.exit(1);
  }
}

// Run
main();
