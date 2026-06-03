// ============================================================
// AI Script Generation using OpenAI GPT-4o-mini
// Chunked approach: H2 → mini-scripts → final script
// Uses fetch + Structured Output (json_schema)
// ============================================================

import 'dotenv/config';
import type { ArticleAnalysis } from './analyzer-types.js';
import type { VideoScript, ScriptTone } from './types.js';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_MODEL = 'gpt-4o-mini';
const TARGET_DURATION = 120;

interface ChunkSummary {
  heading: string;
  narration: string;
  keywords: string[];
}

// ── JSON Schema for chunk narration ──
const chunkSchema = {
  name: 'chunk_narration',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      narration: { type: 'string', description: '4-6 câu tiếng Việt tóm tắt chi tiết phần này, có ví dụ cụ thể' },
      keywords: { type: 'array', items: { type: 'string' }, description: '2-3 keywords tiếng Anh cho stock image' },
    },
    required: ['narration', 'keywords'],
    additionalProperties: false,
  },
};

// ── JSON Schema for final video script ──
const scriptSchema = {
  name: 'video_script',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      intro: {
        type: 'object',
        properties: {
          text: { type: 'string' },
          duration: { type: 'number' },
          keywords: { type: 'array', items: { type: 'string' } },
        },
        required: ['text', 'duration', 'keywords'],
        additionalProperties: false,
      },
      toc: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Narration giới thiệu ngắn gọn các mục sẽ nói trong video' },
          duration: { type: 'number' },
          keywords: { type: 'array', items: { type: 'string' } },
        },
        required: ['text', 'duration', 'keywords'],
        additionalProperties: false,
      },
      sections: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            narration: { type: 'string' },
            highlights: { type: 'array', items: { type: 'string' } },
            duration: { type: 'number' },
            keywords: { type: 'array', items: { type: 'string' } },
          },
          required: ['title', 'narration', 'highlights', 'duration', 'keywords'],
          additionalProperties: false,
        },
      },
      summary: {
        type: 'object',
        properties: {
          text: { type: 'string' },
          duration: { type: 'number' },
          keywords: { type: 'array', items: { type: 'string' } },
        },
        required: ['text', 'duration', 'keywords'],
        additionalProperties: false,
      },
      closing: {
        type: 'object',
        properties: {
          text: { type: 'string' },
          duration: { type: 'number' },
          keywords: { type: 'array', items: { type: 'string' } },
        },
        required: ['text', 'duration', 'keywords'],
        additionalProperties: false,
      },
    },
    required: ['intro', 'toc', 'sections', 'summary', 'closing'],
    additionalProperties: false,
  },
};

/**
 * Call OpenAI API directly via fetch (bypass SDK gzip issue)
 */
async function callOpenAI(
  messages: { role: string; content: string }[],
  schema: any,
  maxTokens?: number
): Promise<any> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
      'Accept-Encoding': 'identity',
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages,
      response_format: { type: 'json_schema', json_schema: schema },
      temperature: 0.8,
      ...(maxTokens ? { max_tokens: maxTokens } : {}),
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI API ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error(`Empty response (finish: ${data.choices?.[0]?.finish_reason})`);
  }

  return JSON.parse(content);
}

/**
 * Step 1: Generate mini-narration for each H2 chunk
 */
async function generateChunkNarration(
  heading: string,
  subHeadings: string[],
  articleTitle: string,
  tone: string
): Promise<ChunkSummary> {
  const subList = subHeadings.length > 0
    ? `\nCác mục con:\n${subHeadings.map(h => `  - ${h}`).join('\n')}`
    : '';

  const parsed = await callOpenAI(
    [
      { role: 'system', content: 'Tóm tắt ngắn gọn, tiếng Việt, dễ đọc thành giọng nói. QUAN TRỌNG: Luôn đưa ví dụ cụ thể, con số, tên công cụ/tính năng thực tế từ nội dung bài viết. Tuyệt đối KHÔNG viết chung chung. Mỗi phần chỉ cần đọc trong khoảng 15-18 giây.' },
      { role: 'user', content: `Tóm tắt phần "${heading}" trong bài "${articleTitle}" thành 3-4 câu, phong cách ${tone}. Bắt buộc phải kèm ít nhất 1 ví dụ cụ thể (tên tính năng, con số, use case thực tế) từ nội dung. Narration đọc trong ~18 giây (khoảng 150-200 ký tự).${subList}` },
    ],
    chunkSchema,
    400
  );

  return {
    heading,
    narration: parsed.narration || `Phần ${heading} của bài viết.`,
    keywords: parsed.keywords || ['technology'],
  };
}

/**
 * Step 2: Combine chunk summaries into final video script
 */
async function combineIntoScript(
  chunks: ChunkSummary[],
  analysis: ArticleAnalysis,
  tone: ScriptTone
): Promise<any> {
  const toneGuide = getToneGuide(tone);

  const chunkList = chunks
    .map((c, i) => `${i + 1}. [${c.heading}]: ${c.narration}`)
    .join('\n');

  const prompt = `Bạn là Tech Reviewer YouTube Việt Nam. Văn phong: ${toneGuide}

Bài viết: "${analysis.title}" (${analysis.stats.wordCount} từ, ${analysis.stats.imageCount} ảnh)

Tóm tắt các phần:
${chunkList}

Tạo kịch bản video ${TARGET_DURATION}s (2 phút). Chọn tối đa 4 sections quan trọng nhất.
Tổng duration = ${TARGET_DURATION}s. Phân bổ: intro(10s) + toc(8s) + sections(4 × 18s = 72s) + summary(12s) + closing(8s) = ~110s.

Mỗi section phải có narration đọc trong ~18 giây (khoảng 3-4 câu, 150-200 ký tự). Ngắn gọn nhưng có ví dụ cụ thể.
Phần toc: liệt kê ngắn gọn tên các section sẽ nói (ví dụ: "Trong video hôm nay, chúng ta sẽ tìm hiểu... một là..., hai là..., ba là..., và cuối cùng là...").

QUY TẮC BẮT BUỘC:
- Mỗi section PHẢI có ít nhất 2 ví dụ cụ thể (tên tính năng, con số, so sánh cụ thể, use case thực tế)
- KHÔNG viết chung chung kiểu "cực kỳ ấn tượng", "rất hiệu quả" mà không kèm ví dụ
- Ví dụ tốt: "OpenClaw có thể tự động đặt lịch họp, soạn email và quản lý calendar mà không cần bạn ra lệnh. Chỉ trong 5 giây, nó phân tích 1000 email và phân loại theo mức độ ưu tiên."
- Ví dụ xấu: "OpenClaw hỗ trợ người dùng trong nhiều tác vụ hàng ngày một cách độc lập"
- Highlights phải cụ thể, tránh các cụm từ mơ hồ
- Intro cần hấp dẫn, giới thiệu tổng quan chủ đề
- Summary cần tóm lại các điểm chính đã nói`;

  return await callOpenAI(
    [
      { role: 'system', content: 'Tạo kịch bản video tiếng Việt.' },
      { role: 'user', content: prompt },
    ],
    scriptSchema
  );
}

/**
 * Main: Generate video script with chunked approach
 */
export async function generateScript(
  analysis: ArticleAnalysis,
  tone: ScriptTone = (process.env.SCRIPT_TONE as ScriptTone) || 'review'
): Promise<VideoScript> {
  console.log(`🎬 Generating video script (chunked, tone: ${tone})...`);

  // ── Step 1: Extract H2 chunks, skip tutorial/step-by-step ──
  const skipPatterns = [
    /các bước/i, /hướng dẫn/i, /cách cài/i, /cài đặt/i,
    /step by step/i, /cách sử dụng/i, /cách tạo/i, /cách thiết lập/i,
    /thao tác/i, /câu hỏi thường gặp/i, /faq/i,
  ];

  const h2Chunks: { heading: string; subHeadings: string[] }[] = [];
  let currentH2: { heading: string; subHeadings: string[] } | null = null;
  let skipCurrent = false;

  for (const item of analysis.outline) {
    if (item.level === 2) {
      if (currentH2 && !skipCurrent) h2Chunks.push(currentH2);
      skipCurrent = skipPatterns.some(p => p.test(item.text));
      if (skipCurrent) {
        console.log(`  ⏭️  Skip: "${item.text}"`);
        currentH2 = null;
      } else {
        currentH2 = { heading: item.text, subHeadings: [] };
      }
    } else if (item.level === 3 && currentH2 && !skipCurrent) {
      currentH2.subHeadings.push(item.text);
    }
  }
  if (currentH2 && !skipCurrent) h2Chunks.push(currentH2);

  console.log(`  📋 ${h2Chunks.length} H2 chunks (after filter)`);

  // ── Step 2: Generate narration per chunk (parallel, batches of 3) ──
  const chunkSummaries: ChunkSummary[] = [];
  const batchSize = 3;

  for (let i = 0; i < h2Chunks.length; i += batchSize) {
    const batch = h2Chunks.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(chunk =>
        generateChunkNarration(chunk.heading, chunk.subHeadings, analysis.title, tone)
      )
    );
    chunkSummaries.push(...results);
    console.log(`  🔊 Chunks ${i + 1}-${Math.min(i + batchSize, h2Chunks.length)}/${h2Chunks.length} done`);
  }

  console.log(`  ✅ ${chunkSummaries.length} chunks summarized`);

  // ── Step 3: Combine into final script ──
  console.log(`  🎬 Combining into final script...`);

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const script = await combineIntoScript(chunkSummaries, analysis, tone);

      const totalDuration = script.intro.duration +
        script.toc.duration +
        script.sections.reduce((sum: number, s: any) => sum + s.duration, 0) +
        script.summary.duration +
        script.closing.duration;

      const result: VideoScript = {
        ...script,
        totalDuration,
        generatedAt: new Date().toISOString(),
        tone,
        articleStats: {
          wordCount: analysis.stats.wordCount,
          imageCount: analysis.stats.imageCount,
          headingCount: analysis.stats.headingCount.h2,
          linkCount: analysis.stats.linkCount.internal + analysis.stats.linkCount.external,
        },
      };

      console.log(`✅ Script: ${result.sections.length} sections, ${totalDuration}s total`);
      console.log(`\n  ╔══════════════ 📝 KỊC BẢN VIDEO ══════════════╗`);
      console.log(`  ║ 🎬 INTRO (${result.intro.duration}s)`);
      console.log(`  ║ "${result.intro.text}"`);
      console.log(`  ║─────────────────────────────────────────────────`);
      console.log(`  ║ 📋 TOC (${result.toc.duration}s)`);
      console.log(`  ║ "${result.toc.text}"`);
      result.sections.forEach((s, i) => {
        console.log(`  ║─────────────────────────────────────────────────`);
        console.log(`  ║ 📌 SECTION ${i + 1}: ${s.title} (${s.duration}s)`);
        console.log(`  ║ "${s.narration}"`);
        console.log(`  ║ Highlights: ${s.highlights.join(', ')}`);
      });
      console.log(`  ║─────────────────────────────────────────────────`);
      console.log(`  ║ 📊 SUMMARY (${result.summary.duration}s)`);
      console.log(`  ║ "${result.summary.text}"`);
      console.log(`  ║─────────────────────────────────────────────────`);
      console.log(`  ║ 👋 CLOSING (${result.closing.duration}s)`);
      console.log(`  ║ "${result.closing.text}"`);
      console.log(`  ╚═════════════════════════════════════════════════╝\n`);

      if (Math.abs(totalDuration - TARGET_DURATION) > 5) {
        console.warn(`⚠️ Duration mismatch: ${totalDuration}s vs target ${TARGET_DURATION}s`);
      }

      return result;
    } catch (err) {
      lastError = err as Error;
      console.warn(`⚠️ Combine attempt ${attempt}/3 failed: ${lastError.message}`);
      if (attempt < 3) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }
  }

  throw new Error(`Failed to generate script: ${lastError?.message}`);
}

function getToneGuide(tone: ScriptTone): string {
  const guides: Record<ScriptTone, string> = {
    review: `Review công nghệ chuyên nghiệp, YouTuber tech Việt Nam. Nhận xét sắc sảo, tự tin, dùng từ "cực kỳ ấn tượng", "đáng để thử", "quá xịn sò".`,
    summary: `Tóm tắt rõ ràng, đi thẳng trọng tâm. Ngắn gọn, dễ hiểu. Tone trung lập, chuyên nghiệp.`,
    tutorial: `Hướng dẫn dễ hiểu, thân thiện. Giải thích thuật ngữ khi cần. Nhấn mạnh bước quan trọng.`,
  };
  return guides[tone];
}
