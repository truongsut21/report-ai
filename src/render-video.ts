// ============================================================
// HyperFrames Render Wrapper
// ============================================================

import { execSync } from 'child_process';
import { mkdirSync, copyFileSync, existsSync, readdirSync } from 'fs';
import { resolve } from 'path';

const COMP_DIR = resolve(process.cwd(), 'composition');
const AUDIO_DIR = resolve(process.cwd(), 'audio');
const OUTPUT_DIR = resolve(process.cwd(), 'output');

/**
 * Copy audio files into composition directory so HyperFrames can find them
 */
export function syncAudioToComposition(): void {
  const compAudioDir = resolve(COMP_DIR, 'audio');
  mkdirSync(compAudioDir, { recursive: true });

  if (!existsSync(AUDIO_DIR)) return;

  const files = readdirSync(AUDIO_DIR).filter(f => f.endsWith('.wav') || f.endsWith('.mp3'));
  for (const file of files) {
    copyFileSync(resolve(AUDIO_DIR, file), resolve(compAudioDir, file));
  }
  console.log(`  📂 Synced ${files.length} audio files to composition/audio/`);
}

/**
 * Preview the composition in browser
 */
export function previewVideo(): void {
  console.log('👁️ Starting HyperFrames preview...');
  syncAudioToComposition();
  try {
    execSync(`npx hyperframes preview`, {
      cwd: COMP_DIR,
      stdio: 'inherit',
    });
  } catch (err) {
    console.error('❌ Preview failed:', (err as Error).message);
  }
}

/**
 * Render the composition to MP4
 */
export function renderVideo(outputPath?: string): string {
  const date = new Date().toISOString().split('T')[0];
  const output = outputPath || resolve(OUTPUT_DIR, `daily-report-${date}.mp4`);

  mkdirSync(resolve(output, '..'), { recursive: true });
  syncAudioToComposition();

  console.log(`🎬 Rendering video to ${output}...`);
  console.log('   This may take a few minutes...\n');

  try {
    execSync(`npx hyperframes render --output "${output}"`, {
      cwd: COMP_DIR,
      stdio: 'inherit',
      timeout: 300_000,
    });

    console.log(`\n✅ Video rendered successfully!`);
    console.log(`📁 Output: ${output}`);

    try {
      execSync(`open "${output}"`, { stdio: 'ignore' });
    } catch { /* ignore */ }

    return output;
  } catch (err) {
    throw new Error(`Render failed: ${(err as Error).message}`);
  }
}
