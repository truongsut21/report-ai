import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';
import { writeFileSync } from 'fs';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
const TTS_MODEL = 'gemini-2.5-flash-preview-tts';

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

async function testTTS(text: string, filename: string) {
  try {
    console.log(`Generating audio for: "${text}"`);
    const response = await ai.models.generateContent({
      model: TTS_MODEL,
      contents: [{ role: 'user', parts: [{ text }] }],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Puck' },
          },
        },
      } as any,
    });
    const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (audioData) {
      const pcm = Buffer.from(audioData, 'base64');
      const wav = pcmToWav(pcm, 24000, 1, 16);
      writeFileSync(filename, wav);
      // Estimate duration: 24000 samples/sec * 2 bytes/sample = 48000 bytes/sec
      const duration = pcm.length / 48000;
      console.log(`✅ Saved ${filename} (${duration.toFixed(2)}s)`);
    } else {
      console.log('❌ No audio data returned');
    }
  } catch (err: any) {
    console.log('❌ Failed:', err.message);
  }
}

async function run() {
  console.log('--- Clean text ---');
  await testTTS('Chào các bạn, đây là báo cáo công việc tuần này!', 'audio-clean.wav');

  console.log('\n--- Bracketed style instruction ---');
  await testTTS('[Phong cách review phim] Chào các bạn, đây là báo cáo công việc tuần này!', 'audio-bracketed.wav');

  console.log('\n--- Colon style instruction ---');
  await testTTS('Phong cách review phim: Chào các bạn, đây là báo cáo công việc tuần này!', 'audio-colon.wav');
}

run();
