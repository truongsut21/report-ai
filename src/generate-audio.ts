// ============================================================
// TTS Audio Generation using ElevenLabs
// Converts script text to speech with Vietnamese preprocessing
// ============================================================

import 'dotenv/config';
import { writeFileSync, mkdirSync, statSync } from 'fs';
import { resolve } from 'path';
import { execSync } from 'child_process';
import { preprocessVietnamese } from './vietnamese-preprocessor.js';
import type { VideoScript, AudioFile } from './types.js';

const AUDIO_DIR = resolve(process.cwd(), 'audio');

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || '';
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'pNInz6obpgDQGcFmaJgB';
const ELEVENLABS_MODEL_ID = process.env.ELEVENLABS_MODEL_ID || 'eleven_turbo_v2_5';

function pcmToWav(pcmData: Buffer, sampleRate: number, numChannels: number, bitsPerSample: number): Buffer {
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcmData.length;
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);
  return Buffer.concat([header, pcmData]);
}

/**
 * Generate all audio files from a video script using ElevenLabs TTS
 */
export async function generateAllAudio(script: VideoScript): Promise<AudioFile[]> {
  mkdirSync(AUDIO_DIR, { recursive: true });

  if (!ELEVENLABS_API_KEY) {
    throw new Error('ELEVENLABS_API_KEY is not set in .env');
  }

  // Prepare batch inputs
  const items = [
    {
      id: 'intro',
      text: preprocessVietnamese(script.intro.text),
      outputPath: resolve(AUDIO_DIR, 'intro.wav'),
    },
    {
      id: 'toc',
      text: preprocessVietnamese(script.toc.text),
      outputPath: resolve(AUDIO_DIR, 'toc.wav'),
    },
  ];

  for (let i = 0; i < script.sections.length; i++) {
    items.push({
      id: `section-${i + 1}`,
      text: preprocessVietnamese(script.sections[i].narration),
      outputPath: resolve(AUDIO_DIR, `section-${i + 1}.wav`),
    });
  }

  items.push({
    id: 'summary',
    text: preprocessVietnamese(script.summary.text),
    outputPath: resolve(AUDIO_DIR, 'summary.wav'),
  });

  items.push({
    id: 'closing',
    text: preprocessVietnamese(script.closing.text),
    outputPath: resolve(AUDIO_DIR, 'closing.wav'),
  });

  console.log(`🎙️ ElevenLabs TTS | Voice: ${ELEVENLABS_VOICE_ID} | Model: ${ELEVENLABS_MODEL_ID}`);
  const audioFiles: AudioFile[] = [];

  for (const item of items) {
    console.log(`  🔊 [${item.id}] (${item.text.length} chars)...`);
    try {
      const url = `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}?output_format=pcm_24000`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: item.text,
          model_id: ELEVENLABS_MODEL_ID,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`ElevenLabs API ${response.status}: ${errText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const pcm = Buffer.from(arrayBuffer);
      const wav = pcmToWav(pcm, 24000, 1, 16);
      writeFileSync(item.outputPath, wav);

      const duration = getAudioDuration(item.outputPath);
      console.log(`  ✅ [${item.id}] ${duration.toFixed(1)}s`);

      audioFiles.push({
        path: item.outputPath,
        duration,
        sectionId: item.id,
      });
    } catch (err: any) {
      console.error(`  ❌ [${item.id}] failed:`, err.message || err);
      throw err;
    }
  }

  console.log(`✅ Generated ${audioFiles.length} audio files`);
  return audioFiles;
}

/**
 * Get audio duration in seconds using ffprobe
 */
function getAudioDuration(filePath: string): number {
  try {
    const result = execSync(
      `ffprobe -i "${filePath}" -show_entries format=duration -v quiet -of csv="p=0"`,
      { encoding: 'utf-8' }
    ).trim();
    return parseFloat(result) || 0;
  } catch {
    // Fallback: estimate from file size (PCM 24kHz 16-bit mono)
    const stats = statSync(filePath);
    const headerSize = 44;
    const dataSize = stats.size - headerSize;
    return dataSize / (24000 * 2);
  }
}

/**
 * Update script durations based on actual audio lengths
 */
export function updateScriptTimings(script: VideoScript, audioFiles: AudioFile[]): VideoScript {
  const updated = { ...script };

  for (const audio of audioFiles) {
    if (audio.sectionId === 'intro') {
      updated.intro = { ...updated.intro, duration: audio.duration };
    } else if (audio.sectionId === 'toc') {
      updated.toc = { ...updated.toc, duration: audio.duration };
    } else if (audio.sectionId === 'summary') {
      updated.summary = { ...updated.summary, duration: audio.duration };
    } else if (audio.sectionId === 'closing') {
      updated.closing = { ...updated.closing, duration: audio.duration };
    } else if (audio.sectionId.startsWith('section-')) {
      const idx = parseInt(audio.sectionId.split('-')[1]) - 1;
      if (updated.sections[idx]) {
        updated.sections[idx] = { ...updated.sections[idx], duration: audio.duration };
      }
    }
  }

  updated.totalDuration = updated.intro.duration +
    updated.toc.duration +
    updated.sections.reduce((sum, s) => sum + s.duration, 0) +
    updated.summary.duration +
    updated.closing.duration;

  return updated;
}
