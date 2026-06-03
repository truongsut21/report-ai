// ============================================================
// HyperFrames Video Composition Generator
// Creates HTML composition from blog post review script
// Premium UX: Mind Map, Feature Cards, Comparison, Checklist
// ============================================================

import 'dotenv/config';
import { writeFileSync, mkdirSync, copyFileSync, existsSync } from 'fs';
import { resolve, relative } from 'path';
import type { VideoScript, AudioFile, StockMedia, VideoScene } from './types.js';

const COMP_DIR = resolve(process.cwd(), 'composition');
const WIDTH = parseInt(process.env.VIDEO_WIDTH || '1920', 10);
const HEIGHT = parseInt(process.env.VIDEO_HEIGHT || '1080', 10);
const BG_BLUR = parseInt(process.env.BG_BLUR || '18', 10);
const BG_BRIGHTNESS = parseFloat(process.env.BG_BRIGHTNESS || '0.25');

// Visual style rotation for sections
const SECTION_STYLES = ['mindmap', 'cards', 'comparison', 'checklist'] as const;
type SectionStyle = typeof SECTION_STYLES[number];

/**
 * Generate HyperFrames HTML composition
 */
export function composeVideo(
  script: VideoScript,
  audioFiles: AudioFile[],
  media: StockMedia[]
): void {
  console.log('🎨 Composing HyperFrames video...');
  mkdirSync(COMP_DIR, { recursive: true });

  // Copy background image
  const bgSrc = resolve(process.cwd(), '697979967_1410200871126490_8125823451469362651_n (1).jpg');
  const bgDst = resolve(COMP_DIR, 'bg.jpg');
  if (existsSync(bgSrc)) {
    copyFileSync(bgSrc, bgDst);
  }

  const scenes = buildScenes(script, audioFiles, media);
  const html = generateHTML(scenes, script, audioFiles);
  writeFileSync(resolve(COMP_DIR, 'index.html'), html);

  const css = generateCSS(script);
  writeFileSync(resolve(COMP_DIR, 'styles.css'), css);

  const animations = generateAnimations(scenes, script, audioFiles);
  writeFileSync(resolve(COMP_DIR, 'animations.js'), animations);

  console.log(`✅ Composition generated in ${COMP_DIR}`);
}

function buildScenes(
  script: VideoScript,
  audioFiles: AudioFile[],
  media: StockMedia[]
): VideoScene[] {
  const scenes: VideoScene[] = [];
  let currentTime = 0;

  const findAudio = (id: string) => audioFiles.find(a => a.sectionId === id);

  // 1. Intro scene
  const introAudio = findAudio('intro');
  const introDuration = introAudio?.duration || script.intro.duration;
  scenes.push({
    id: 'intro',
    startTime: currentTime,
    duration: introDuration,
    narrationAudio: introAudio,
    title: 'TECH REVIEW',
    subtitle: script.sections[0]?.title || '',
    type: 'intro',
  });
  currentTime += introDuration;

  // 2. TOC scene (table of contents) - now has its own narration
  const tocAudio = findAudio('toc');
  const tocDuration = tocAudio?.duration || 8;
  scenes.push({
    id: 'toc',
    startTime: currentTime,
    duration: tocDuration,
    narrationAudio: tocAudio,
    title: 'NỘI DUNG VIDEO',
    type: 'toc',
  });
  currentTime += tocDuration;

  // 3-N. Individual section scenes
  script.sections.forEach((sec, idx) => {
    const secAudio = findAudio(`section-${idx + 1}`);
    const secDuration = secAudio?.duration || sec.duration;
    scenes.push({
      id: `section-${idx + 1}`,
      startTime: currentTime,
      duration: secDuration,
      narrationAudio: secAudio,
      title: sec.title,
      highlights: sec.highlights,
      type: 'section',
      sectionIndex: idx,
    });
    currentTime += secDuration;
  });

  // Summary scene
  const summaryAudio = findAudio('summary');
  scenes.push({
    id: 'summary',
    startTime: currentTime,
    duration: summaryAudio?.duration || script.summary.duration,
    narrationAudio: summaryAudio,
    title: 'ĐÁNH GIÁ TỔNG QUAN',
    type: 'summary',
  });
  currentTime += scenes[scenes.length - 1].duration;

  // Closing scene
  const closingAudio = findAudio('closing');
  scenes.push({
    id: 'closing',
    startTime: currentTime,
    duration: closingAudio?.duration || script.closing.duration,
    narrationAudio: closingAudio,
    title: 'CẢM ƠN',
    type: 'closing',
  });

  return scenes;
}

function getSectionStyle(index: number): SectionStyle {
  return SECTION_STYLES[index % SECTION_STYLES.length];
}

function generateHTML(scenes: VideoScene[], script: VideoScript, audioFiles: AudioFile[]): string {
  const totalDuration = scenes.reduce((sum, s) => sum + s.duration, 0);
  const findAudio = (id: string) => audioFiles.find(a => a.sectionId === id);

  const stats = script.articleStats || { wordCount: 0, imageCount: 0, headingCount: 0, linkCount: 0 };

  const sceneElements = scenes.map((scene, idx) => {
    const audioPath = scene.narrationAudio ? `audio/${scene.narrationAudio.sectionId}.wav` : '';
    let content = '';

    switch (scene.type) {
      case 'intro':
        content = `
      <div class="scene scene-intro clip" id="scene-intro" data-start="${scene.startTime}" data-duration="${scene.duration}" data-track-index="${idx + 1}">
        <div class="scene-bg gradient-bg-intro"></div>
        <div class="scene-overlay"></div>
        <!-- Pulsing rings -->
        <div class="intro-rings">
          <div class="intro-ring intro-ring-1"></div>
          <div class="intro-ring intro-ring-2"></div>
          <div class="intro-ring intro-ring-3"></div>
        </div>
        <!-- Floating particles -->
        <div class="particles-container" id="particles-intro">
          ${Array.from({length: 12}, (_, i) => `<div class="particle particle-${i + 1}"></div>`).join('\n          ')}
        </div>
        <div class="scene-content intro-content">
          <div class="intro-badge">
            <span class="badge-icon">🔍</span>
            <span class="badge-label">TECH REVIEW</span>
          </div>
          <h1 class="intro-title" id="intro-title">${scene.title}</h1>
          <p class="intro-date" id="intro-date">${scene.subtitle}</p>
          <div class="intro-author">
            <span class="author-label">Reviewer</span>
            <span class="author-name">Vietnix Tech</span>
          </div>
          <div class="intro-loader-container">
            <div class="intro-loader-fill"></div>
          </div>
        </div>
      </div>`;
        break;

      case 'toc':
        content = `
      <div class="scene scene-toc clip" id="scene-toc" data-start="${scene.startTime}" data-duration="${scene.duration}" data-track-index="${idx + 1}">
        <div class="scene-bg gradient-bg-toc"></div>
        <div class="scene-overlay"></div>
        <div class="scene-content toc-content">
          <div class="toc-header">
            <div class="toc-badge">📋 NỘI DUNG</div>
            <h2 class="toc-title">Những gì chúng ta sẽ tìm hiểu</h2>
          </div>
          <div class="toc-timeline">
            <div class="toc-line"></div>
            ${script.sections.map((s, sIdx) => `
            <div class="toc-item" id="toc-item-${sIdx + 1}">
              <div class="toc-dot">
                <span class="toc-dot-inner">${sIdx + 1}</span>
              </div>
              <div class="toc-item-content">
                <span class="toc-item-title">${s.title}</span>
              </div>
            </div>`).join('\n            ')}
          </div>
        </div>
      </div>`;
        break;

      case 'section': {
        const sIdx = scene.sectionIndex ?? 0;
        const sec = script.sections[sIdx];
        const style = getSectionStyle(sIdx);
        content = generateSectionHTML(scene, sec, sIdx, style, idx);
        break;
      }

      case 'summary': {
        content = `
      <div class="scene scene-summary clip" id="scene-summary" data-start="${scene.startTime}" data-duration="${scene.duration}" data-track-index="${idx + 1}">
        <div class="scene-bg gradient-bg-summary"></div>
        <div class="scene-overlay"></div>
        <div class="scene-content summary-content">
          <div class="summary-header">
            <div class="summary-badge">📊 TỔNG KẾT</div>
            <h2 class="summary-title" id="summary-title">${scene.title}</h2>
          </div>
          <div class="summary-dashboard">
            <div class="radial-stat" id="radial-words">
              <svg class="radial-ring" viewBox="0 0 120 120">
                <circle class="radial-track" cx="60" cy="60" r="52" />
                <circle class="radial-fill radial-fill-1" cx="60" cy="60" r="52" />
              </svg>
              <div class="radial-inner">
                <span class="radial-number" id="stat-words">${stats.wordCount.toLocaleString()}</span>
                <span class="radial-label">Số từ</span>
              </div>
            </div>
            <div class="radial-stat" id="radial-images">
              <svg class="radial-ring" viewBox="0 0 120 120">
                <circle class="radial-track" cx="60" cy="60" r="52" />
                <circle class="radial-fill radial-fill-2" cx="60" cy="60" r="52" />
              </svg>
              <div class="radial-inner">
                <span class="radial-number" id="stat-images">${stats.imageCount}</span>
                <span class="radial-label">Hình ảnh</span>
              </div>
            </div>
            <div class="radial-stat" id="radial-headings">
              <svg class="radial-ring" viewBox="0 0 120 120">
                <circle class="radial-track" cx="60" cy="60" r="52" />
                <circle class="radial-fill radial-fill-3" cx="60" cy="60" r="52" />
              </svg>
              <div class="radial-inner">
                <span class="radial-number" id="stat-headings">${stats.headingCount}</span>
                <span class="radial-label">Heading</span>
              </div>
            </div>
            <div class="radial-stat" id="radial-links">
              <svg class="radial-ring" viewBox="0 0 120 120">
                <circle class="radial-track" cx="60" cy="60" r="52" />
                <circle class="radial-fill radial-fill-4" cx="60" cy="60" r="52" />
              </svg>
              <div class="radial-inner">
                <span class="radial-number" id="stat-links">${stats.linkCount}</span>
                <span class="radial-label">Liên kết</span>
              </div>
            </div>
          </div>
        </div>
      </div>`;
        break;
      }

      case 'closing':
        content = `
      <div class="scene scene-closing clip" id="scene-closing" data-start="${scene.startTime}" data-duration="${scene.duration}" data-track-index="${idx + 1}">
        <div class="scene-bg gradient-bg-closing"></div>
        <div class="scene-overlay"></div>
        <div class="scene-content closing-content">
          <div class="closing-card">
            <h2 class="closing-title" id="closing-title">🙏 ${scene.title}</h2>
            <p class="closing-text" id="closing-text">Cảm ơn các bạn đã theo dõi video!</p>
            <div class="social-cta">
              <div class="cta-btn cta-like" id="cta-like">
                <span class="cta-icon">👍</span>
                <span class="cta-label">Like</span>
              </div>
              <div class="cta-btn cta-subscribe" id="cta-subscribe">
                <span class="cta-icon">🔔</span>
                <span class="cta-label">Subscribe</span>
              </div>
              <div class="cta-btn cta-share" id="cta-share">
                <span class="cta-icon">🔗</span>
                <span class="cta-label">Share</span>
              </div>
            </div>
            <div class="closing-signature">Vietnix Tech Review</div>
          </div>
        </div>
      </div>`;
        break;
    }

    // Add audio tracks
    if (audioPath) {
      content += `
      <audio id="audio-${scene.id}" data-start="${scene.startTime}" data-duration="${scene.duration}" data-track-index="${scenes.length + idx + 1}" src="${audioPath}"></audio>`;
    }

    return content;
  }).join('\n');

  const bgMusicElement = `<audio id="bg-music" data-start="0" data-duration="${totalDuration}" data-track-index="99" data-volume="0.08" src="audio/bg-music.mp3"></audio>`;

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Tech Review Video</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div id="stage"
    data-composition-id="tech-review"
    data-start="0"
    data-width="${WIDTH}"
    data-height="${HEIGHT}">

    <!-- Background Image -->
    <div class="bg-image"><img src="bg.jpg" alt="bg" /></div>

    <!-- Ambient Glow Blobs -->
    <div class="glow-blobs-container">
      <div class="glow-blob glow-blob-1"></div>
      <div class="glow-blob glow-blob-2"></div>
      <div class="glow-blob glow-blob-3"></div>
    </div>

${sceneElements}
    ${bgMusicElement}

    <!-- Subtitles -->
    <div class="subtitle-container">
      <div class="subtitle-text" id="subtitle-text"></div>
    </div>

  </div>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
  <script src="animations.js"></script>
</body>
</html>`;
}

function generateSectionHTML(
  scene: VideoScene,
  sec: { title: string; narration: string; highlights: string[]; duration: number },
  sIdx: number,
  style: SectionStyle,
  trackIdx: number
): string {
  const highlights = sec.highlights || [];
  const gradientClass = `gradient-bg-section-${(sIdx % 4) + 1}`;
  const sectionIcons = ['🧠', '⚙️', '⚔️', '🛡️', '🔬', '📡'];
  const icon = sectionIcons[sIdx % sectionIcons.length];

  switch (style) {
    case 'mindmap':
      return `
      <div class="scene scene-section scene-mindmap clip" id="scene-section-${sIdx + 1}" data-start="${scene.startTime}" data-duration="${scene.duration}" data-track-index="${trackIdx + 1}">
        <div class="scene-bg ${gradientClass}"></div>
        <div class="scene-overlay"></div>
        <div class="scene-content mindmap-content">
          <div class="section-badge-top">
            <span class="section-badge-num">${sIdx + 1}</span>
            <span class="section-badge-label">PHẦN ${sIdx + 1}</span>
          </div>
          <div class="mindmap-container">
            <!-- SVG Connection Lines -->
            <svg class="mindmap-svg" id="mindmap-svg-${sIdx + 1}" viewBox="0 0 900 500" preserveAspectRatio="xMidYMid meet">
              ${highlights.map((_, hIdx) => {
                const angles = [-40, 0, 40];
                const angle = angles[hIdx % angles.length] * (Math.PI / 180);
                const cx = 450, cy = 250;
                const endX = cx + Math.cos(angle) * 300;
                const endY = cy + Math.sin(angle) * 180;
                return `<path class="mindmap-line mindmap-line-${hIdx + 1}" d="M ${cx} ${cy} Q ${cx + 100} ${cy + (hIdx - 1) * 60} ${endX} ${endY}" />`;
              }).join('\n              ')}
            </svg>
            <!-- Central Node -->
            <div class="mindmap-center" id="mindmap-center-${sIdx + 1}">
              <span class="mindmap-center-icon">${icon}</span>
              <span class="mindmap-center-text">${sec.title}</span>
            </div>
            <!-- Branch Nodes -->
            ${highlights.map((h, hIdx) => `
            <div class="mindmap-node mindmap-node-${hIdx + 1}" id="mindmap-node-${sIdx + 1}-${hIdx + 1}">
              <div class="mindmap-node-dot"></div>
              <span class="mindmap-node-text">${h}</span>
            </div>`).join('')}
          </div>
        </div>
      </div>`;

    case 'cards':
      return `
      <div class="scene scene-section scene-cards clip" id="scene-section-${sIdx + 1}" data-start="${scene.startTime}" data-duration="${scene.duration}" data-track-index="${trackIdx + 1}">
        <div class="scene-bg ${gradientClass}"></div>
        <div class="scene-overlay"></div>
        <div class="scene-content cards-content">
          <div class="section-badge-top">
            <span class="section-badge-num">${sIdx + 1}</span>
            <span class="section-badge-label">PHẦN ${sIdx + 1}</span>
          </div>
          <h2 class="section-scene-title" id="section-title-${sIdx + 1}">${sec.title}</h2>
          <div class="cards-grid">
            ${highlights.map((h, hIdx) => {
              const cardIcons = ['⚡', '🎯', '💡', '🚀', '🔧', '✨'];
              return `
            <div class="feature-card" id="feature-card-${sIdx + 1}-${hIdx + 1}">
              <div class="feature-card-glow"></div>
              <div class="feature-card-icon">${cardIcons[hIdx % cardIcons.length]}</div>
              <div class="feature-card-text">${h}</div>
              <div class="feature-card-line"></div>
            </div>`;
            }).join('')}
          </div>
        </div>
      </div>`;

    case 'comparison':
      return `
      <div class="scene scene-section scene-comparison clip" id="scene-section-${sIdx + 1}" data-start="${scene.startTime}" data-duration="${scene.duration}" data-track-index="${trackIdx + 1}">
        <div class="scene-bg ${gradientClass}"></div>
        <div class="scene-overlay"></div>
        <div class="scene-content comparison-content">
          <div class="section-badge-top">
            <span class="section-badge-num">${sIdx + 1}</span>
            <span class="section-badge-label">PHẦN ${sIdx + 1}</span>
          </div>
          <h2 class="section-scene-title" id="section-title-${sIdx + 1}">${sec.title}</h2>
          <div class="comparison-layout">
            <div class="comparison-items">
              ${highlights.map((h, hIdx) => `
              <div class="comparison-row" id="comp-row-${sIdx + 1}-${hIdx + 1}">
                <div class="comp-indicator">
                  <div class="comp-bar">
                    <div class="comp-bar-fill comp-bar-fill-${hIdx + 1}"></div>
                  </div>
                </div>
                <div class="comp-label">${h}</div>
                <div class="comp-check">✓</div>
              </div>`).join('')}
            </div>
          </div>
        </div>
      </div>`;

    case 'checklist':
      return `
      <div class="scene scene-section scene-checklist clip" id="scene-section-${sIdx + 1}" data-start="${scene.startTime}" data-duration="${scene.duration}" data-track-index="${trackIdx + 1}">
        <div class="scene-bg ${gradientClass}"></div>
        <div class="scene-overlay"></div>
        <div class="scene-content checklist-content">
          <div class="section-badge-top">
            <span class="section-badge-num">${sIdx + 1}</span>
            <span class="section-badge-label">PHẦN ${sIdx + 1}</span>
          </div>
          <h2 class="section-scene-title" id="section-title-${sIdx + 1}">${sec.title}</h2>
          <div class="checklist-shield">
            <div class="shield-icon" id="shield-icon-${sIdx + 1}">🛡️</div>
          </div>
          <div class="checklist-items">
            ${highlights.map((h, hIdx) => `
            <div class="checklist-item" id="check-item-${sIdx + 1}-${hIdx + 1}">
              <div class="check-box">
                <svg class="check-svg" viewBox="0 0 24 24">
                  <path class="check-path" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span class="check-text">${h}</span>
            </div>`).join('')}
          </div>
        </div>
      </div>`;
  }
}

function generateCSS(script: VideoScript): string {
  return `/* Tech Review Video Styles - Premium UX */
* { margin: 0; padding: 0; box-sizing: border-box; }
 
body {
  font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
  color: #ffffff;
  overflow: hidden;
  width: ${WIDTH}px;
  height: ${HEIGHT}px;
  background: #08080f;
}
 
#stage {
  width: ${WIDTH}px;
  height: ${HEIGHT}px;
  position: relative;
  overflow: hidden;
  background: #06060c;
}

/* === Background Image (blurred + darkened) === */
.bg-image {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  z-index: 0;
  pointer-events: none;
}

.bg-image img {
  width: 100%; height: 100%;
  object-fit: cover;
  filter: blur(${BG_BLUR}px) brightness(${BG_BRIGHTNESS});
  transform: scale(1.1);
}
 
/* === Ambient Glow Blobs === */
.glow-blobs-container {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
}
 
.glow-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(140px);
  opacity: 0.18;
  mix-blend-mode: screen;
  animation: floatBlobs 20s infinite alternate ease-in-out;
}
 
.glow-blob-1 {
  top: -10%; left: -10%;
  width: 600px; height: 600px;
  background: radial-gradient(circle, #6366f1 0%, rgba(99, 102, 241, 0) 70%);
}
 
.glow-blob-2 {
  bottom: -15%; right: -5%;
  width: 700px; height: 700px;
  background: radial-gradient(circle, #d946ef 0%, rgba(217, 70, 239, 0) 70%);
  animation-delay: -5s;
}
 
.glow-blob-3 {
  top: 30%; right: 20%;
  width: 500px; height: 500px;
  background: radial-gradient(circle, #06b6d4 0%, rgba(6, 182, 212, 0) 70%);
  animation-delay: -10s;
  opacity: 0.12;
}
 
@keyframes floatBlobs {
  0% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(80px, -50px) scale(1.15); }
  100% { transform: translate(-40px, 60px) scale(0.9); }
}
 
/* === Scene Base === */
.scene {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  overflow: hidden;
  z-index: 2;
}
 
.scene-bg {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  object-fit: cover;
  z-index: 0;
}
 
.scene-overlay {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  background: linear-gradient(135deg, rgba(8, 8, 16, 0.55) 0%, rgba(15, 10, 30, 0.45) 100%);
  z-index: 1;
}
 
.scene-content {
  position: relative;
  z-index: 2;
  width: 100%; height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 80px 120px;
}
 
/* === Gradient Backgrounds (semi-transparent to show bg image) === */
.gradient-bg-intro {
  background: linear-gradient(135deg, rgba(9,9,22,0.7) 0%, rgba(21,20,40,0.6) 50%, rgba(13,12,24,0.7) 100%);
}
.gradient-bg-toc {
  background: linear-gradient(135deg, rgba(9,10,21,0.7) 0%, rgba(13,18,37,0.6) 50%, rgba(6,11,24,0.7) 100%);
}
.gradient-bg-section-1 {
  background: linear-gradient(135deg, rgba(10,9,24,0.7) 0%, rgba(21,16,48,0.6) 50%, rgba(13,10,28,0.7) 100%);
}
.gradient-bg-section-2 {
  background: linear-gradient(135deg, rgba(8,10,22,0.7) 0%, rgba(14,24,48,0.6) 50%, rgba(6,12,26,0.7) 100%);
}
.gradient-bg-section-3 {
  background: linear-gradient(135deg, rgba(10,8,16,0.7) 0%, rgba(24,16,42,0.6) 50%, rgba(12,10,24,0.7) 100%);
}
.gradient-bg-section-4 {
  background: linear-gradient(135deg, rgba(8,8,16,0.7) 0%, rgba(16,24,40,0.6) 50%, rgba(10,12,22,0.7) 100%);
}
.gradient-bg-summary {
  background: linear-gradient(135deg, rgba(6,8,16,0.7) 0%, rgba(16,22,37,0.6) 50%, rgba(11,12,22,0.7) 100%);
}
.gradient-bg-closing {
  background: linear-gradient(135deg, rgba(11,8,22,0.7) 0%, rgba(28,21,56,0.6) 100%);
}

/* === Section Badge Top === */
.section-badge-top {
  position: absolute;
  top: 50px;
  left: 120px;
  display: flex;
  align-items: center;
  gap: 12px;
  opacity: 0;
}

.section-badge-num {
  width: 36px; height: 36px;
  display: flex; justify-content: center; align-items: center;
  border-radius: 10px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  font-size: 16px; font-weight: 800;
  color: #fff;
  box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);
}

.section-badge-label {
  font-size: 14px; font-weight: 700;
  color: #a5b4fc;
  letter-spacing: 4px;
  text-transform: uppercase;
}

.section-scene-title {
  font-size: 42px;
  font-weight: 800;
  letter-spacing: -1px;
  background: linear-gradient(135deg, #ffffff 0%, rgba(255,255,255,0.8) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 50px;
  text-align: center;
  max-width: 85%;
  opacity: 0;
}

/* ========================================
   INTRO SCENE
   ======================================== */
.intro-content {
  align-items: center;
  text-align: center;
}

.intro-rings {
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1;
  pointer-events: none;
}

.intro-ring {
  position: absolute;
  border-radius: 50%;
  border: 2px solid rgba(99, 102, 241, 0.15);
  top: 50%; left: 50%;
  transform: translate(-50%, -50%) scale(0);
  opacity: 0;
}

.intro-ring-1 { width: 300px; height: 300px; }
.intro-ring-2 { width: 500px; height: 500px; }
.intro-ring-3 { width: 700px; height: 700px; }

/* Particles */
.particles-container {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  z-index: 1;
  pointer-events: none;
  overflow: hidden;
}

.particle {
  position: absolute;
  width: 4px; height: 4px;
  border-radius: 50%;
  background: #a5b4fc;
  opacity: 0;
}

.particle-1 { top: 20%; left: 10%; }
.particle-2 { top: 15%; left: 30%; }
.particle-3 { top: 30%; left: 80%; }
.particle-4 { top: 60%; left: 5%; }
.particle-5 { top: 70%; left: 90%; }
.particle-6 { top: 80%; left: 40%; }
.particle-7 { top: 10%; left: 60%; }
.particle-8 { top: 50%; left: 70%; }
.particle-9 { top: 40%; left: 20%; }
.particle-10 { top: 85%; left: 75%; }
.particle-11 { top: 25%; left: 50%; }
.particle-12 { top: 65%; left: 35%; }

.intro-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(99, 102, 241, 0.12);
  border: 1px solid rgba(99, 102, 241, 0.25);
  padding: 8px 18px;
  border-radius: 100px;
  margin-bottom: 32px;
  opacity: 0;
}
 
.intro-badge .badge-icon { font-size: 16px; }
 
.intro-badge .badge-label {
  font-size: 14px;
  font-weight: 700;
  color: #a5b4fc;
  letter-spacing: 3px;
  text-transform: uppercase;
}
 
.intro-title {
  font-size: 78px;
  font-weight: 800;
  letter-spacing: -2px;
  line-height: 1.1;
  background: linear-gradient(135deg, #a5b4fc 10%, #6366f1 40%, #d946ef 80%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 24px;
  max-width: 900px;
  opacity: 0;
}
 
.intro-date {
  font-size: 28px;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.65);
  letter-spacing: 1px;
  margin-bottom: 40px;
  max-width: 800px;
  opacity: 0;
}
 
.intro-author {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  opacity: 0;
}
 
.intro-author .author-label {
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.35);
  text-transform: uppercase;
  letter-spacing: 2px;
}
 
.intro-author .author-name {
  font-size: 24px;
  font-weight: 700;
  background: linear-gradient(135deg, #ffffff 0%, rgba(255, 255, 255, 0.7) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
 
.intro-loader-container {
  position: absolute;
  bottom: 0; left: 0;
  width: 100%; height: 6px;
  background: rgba(255, 255, 255, 0.03);
}
 
.intro-loader-fill {
  width: 0%; height: 100%;
  background: linear-gradient(90deg, #6366f1, #d946ef);
  box-shadow: 0 0 10px rgba(99, 102, 241, 0.5);
}

/* ========================================
   TOC (Table of Contents) SCENE
   ======================================== */
.toc-content {
  align-items: flex-start;
  justify-content: center;
  padding: 80px 200px;
}

.toc-header {
  margin-bottom: 50px;
  opacity: 0;
}

.toc-badge {
  font-size: 14px;
  font-weight: 700;
  color: #818cf8;
  letter-spacing: 4px;
  text-transform: uppercase;
  margin-bottom: 10px;
}

.toc-title {
  font-size: 42px;
  font-weight: 800;
  color: #ffffff;
}

.toc-timeline {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 28px;
  width: 100%;
}

.toc-line {
  position: absolute;
  left: 22px;
  top: 0;
  width: 3px;
  height: 0;
  background: linear-gradient(180deg, #6366f1, #d946ef, #06b6d4);
  border-radius: 2px;
  z-index: 0;
}

.toc-item {
  display: flex;
  align-items: center;
  gap: 24px;
  opacity: 0;
  position: relative;
  z-index: 1;
}

.toc-dot {
  width: 46px; height: 46px;
  border-radius: 50%;
  display: flex; justify-content: center; align-items: center;
  background: rgba(99, 102, 241, 0.15);
  border: 2px solid rgba(99, 102, 241, 0.4);
  flex-shrink: 0;
}

.toc-dot-inner {
  font-size: 18px; font-weight: 800;
  color: #a5b4fc;
}

.toc-item-content {
  flex-grow: 1;
  padding: 18px 28px;
  border-radius: 16px;
  background: rgba(15, 15, 28, 0.5);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  border: 1px solid rgba(255,255,255,0.05);
}

.toc-item-title {
  font-size: 22px;
  font-weight: 700;
  color: #ffffff;
}

/* ========================================
   MIND MAP SECTION
   ======================================== */
.mindmap-content {
  justify-content: center;
  align-items: center;
  padding: 100px;
}

.mindmap-container {
  position: relative;
  width: 900px;
  height: 500px;
}

.mindmap-svg {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  z-index: 0;
  pointer-events: none;
}

.mindmap-line {
  fill: none;
  stroke: #6366f1;
  stroke-width: 3;
  stroke-dasharray: 400;
  stroke-dashoffset: 400;
  opacity: 0.6;
  filter: drop-shadow(0 0 6px rgba(99, 102, 241, 0.4));
}

.mindmap-center {
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%) scale(0);
  width: 220px; height: 220px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.15));
  border: 2px solid rgba(99, 102, 241, 0.5);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 10px;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: 0 0 40px rgba(99, 102, 241, 0.2), inset 0 0 40px rgba(99, 102, 241, 0.05);
  z-index: 2;
  opacity: 0;
}

.mindmap-center-icon { font-size: 36px; }

.mindmap-center-text {
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  text-align: center;
  padding: 0 15px;
  line-height: 1.3;
}

.mindmap-node {
  position: absolute;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 24px;
  border-radius: 16px;
  background: rgba(15, 15, 30, 0.6);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  border: 1px solid rgba(99, 102, 241, 0.2);
  opacity: 0;
  z-index: 2;
  max-width: 280px;
  box-shadow: 0 8px 30px rgba(0,0,0,0.3);
}

.mindmap-node-1 { top: 5%; right: 5%; }
.mindmap-node-2 { top: 50%; right: 0; transform: translateY(-50%); }
.mindmap-node-3 { bottom: 5%; right: 5%; }

.mindmap-node-dot {
  width: 10px; height: 10px;
  border-radius: 50%;
  background: #6366f1;
  box-shadow: 0 0 10px rgba(99, 102, 241, 0.6);
  flex-shrink: 0;
}

.mindmap-node-text {
  font-size: 16px;
  font-weight: 600;
  color: rgba(255,255,255,0.9);
  line-height: 1.4;
}

/* ========================================
   FEATURE CARDS SECTION
   ======================================== */
.cards-content {
  justify-content: center;
  align-items: center;
}

.cards-grid {
  display: flex;
  gap: 28px;
  justify-content: center;
  flex-wrap: wrap;
  max-width: 100%;
  perspective: 1000px;
}

.feature-card {
  width: 280px;
  padding: 36px 28px;
  border-radius: 22px;
  background: rgba(15, 15, 30, 0.5);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,0.06);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  text-align: center;
  position: relative;
  overflow: hidden;
  opacity: 0;
  transform: rotateY(90deg);
  transform-origin: left center;
}

.feature-card-glow {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle at center, rgba(99, 102, 241, 0.08) 0%, transparent 60%);
  pointer-events: none;
}

.feature-card-icon {
  font-size: 42px;
  margin-bottom: 4px;
}

.feature-card-text {
  font-size: 17px;
  font-weight: 600;
  color: rgba(255,255,255,0.85);
  line-height: 1.5;
}

.feature-card-line {
  width: 40px; height: 3px;
  border-radius: 2px;
  background: linear-gradient(90deg, #6366f1, #8b5cf6);
  margin-top: 8px;
}

/* ========================================
   COMPARISON SECTION
   ======================================== */
.comparison-content {
  justify-content: center;
  align-items: center;
}

.comparison-layout {
  width: 100%;
  max-width: 800px;
}

.comparison-items {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.comparison-row {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 20px 28px;
  border-radius: 16px;
  background: rgba(15, 15, 30, 0.45);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  border: 1px solid rgba(255,255,255,0.05);
  opacity: 0;
}

.comp-indicator {
  width: 120px;
  flex-shrink: 0;
}

.comp-bar {
  width: 100%;
  height: 8px;
  border-radius: 4px;
  background: rgba(255,255,255,0.06);
  overflow: hidden;
}

.comp-bar-fill {
  height: 100%;
  border-radius: 4px;
  width: 0%;
  transition: width 1s ease;
}

.comp-bar-fill-1 { background: linear-gradient(90deg, #6366f1, #818cf8); }
.comp-bar-fill-2 { background: linear-gradient(90deg, #d946ef, #e879f9); }
.comp-bar-fill-3 { background: linear-gradient(90deg, #06b6d4, #22d3ee); }

.comp-label {
  flex-grow: 1;
  font-size: 18px;
  font-weight: 600;
  color: rgba(255,255,255,0.85);
}

.comp-check {
  width: 32px; height: 32px;
  display: flex; justify-content: center; align-items: center;
  border-radius: 50%;
  background: rgba(34, 197, 94, 0.15);
  color: #22c55e;
  font-size: 16px;
  font-weight: 700;
  opacity: 0;
  transform: scale(0);
}

/* ========================================
   CHECKLIST SECTION
   ======================================== */
.checklist-content {
  justify-content: center;
  align-items: center;
}

.checklist-shield {
  margin-bottom: 40px;
  opacity: 0;
}

.shield-icon {
  font-size: 72px;
  display: inline-block;
  filter: drop-shadow(0 0 20px rgba(99, 102, 241, 0.4));
}

.checklist-items {
  display: flex;
  flex-direction: column;
  gap: 18px;
  max-width: 700px;
  width: 100%;
}

.checklist-item {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 18px 28px;
  border-radius: 14px;
  background: rgba(15, 15, 30, 0.45);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  border: 1px solid rgba(255,255,255,0.05);
  opacity: 0;
}

.check-box {
  width: 28px; height: 28px;
  border-radius: 8px;
  border: 2px solid rgba(99, 102, 241, 0.4);
  display: flex; justify-content: center; align-items: center;
  flex-shrink: 0;
  background: rgba(99, 102, 241, 0.08);
}

.check-svg {
  width: 18px; height: 18px;
}

.check-path {
  fill: none;
  stroke: #22c55e;
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 30;
  stroke-dashoffset: 30;
}

.check-text {
  font-size: 18px;
  font-weight: 600;
  color: rgba(255,255,255,0.85);
}

/* ========================================
   SUMMARY - RADIAL DASHBOARD
   ======================================== */
.summary-content {
  align-items: center;
  justify-content: center;
}

.summary-header {
  margin-bottom: 50px;
  text-align: center;
  opacity: 0;
}

.summary-badge {
  font-size: 14px;
  font-weight: 700;
  color: #d946ef;
  letter-spacing: 4px;
  text-transform: uppercase;
  margin-bottom: 10px;
}

.summary-title {
  font-size: 46px;
  font-weight: 800;
  letter-spacing: -1px;
  color: #ffffff;
}

.summary-dashboard {
  display: flex;
  gap: 50px;
  justify-content: center;
  align-items: center;
  opacity: 0;
}

.radial-stat {
  position: relative;
  width: 160px; height: 160px;
  display: flex;
  justify-content: center;
  align-items: center;
  opacity: 0;
}

.radial-ring {
  position: absolute;
  width: 100%; height: 100%;
  transform: rotate(-90deg);
}

.radial-track {
  fill: none;
  stroke: rgba(255,255,255,0.05);
  stroke-width: 8;
}

.radial-fill {
  fill: none;
  stroke-width: 8;
  stroke-linecap: round;
  stroke-dasharray: 327;
  stroke-dashoffset: 327;
}

.radial-fill-1 { stroke: #6366f1; filter: drop-shadow(0 0 6px rgba(99, 102, 241, 0.5)); }
.radial-fill-2 { stroke: #d946ef; filter: drop-shadow(0 0 6px rgba(217, 70, 239, 0.5)); }
.radial-fill-3 { stroke: #06b6d4; filter: drop-shadow(0 0 6px rgba(6, 182, 212, 0.5)); }
.radial-fill-4 { stroke: #f59e0b; filter: drop-shadow(0 0 6px rgba(245, 158, 11, 0.5)); }

.radial-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  z-index: 2;
}

.radial-number {
  font-size: 28px;
  font-weight: 800;
  color: #ffffff;
}

.radial-label {
  font-size: 13px;
  font-weight: 600;
  color: rgba(255,255,255,0.5);
}

/* ========================================
   CLOSING - SOCIAL CTA
   ======================================== */
.closing-content {
  justify-content: center;
  align-items: center;
}

.closing-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 60px 80px;
  border-radius: 28px;
  background: rgba(15, 15, 30, 0.45);
  backdrop-filter: blur(25px);
  -webkit-backdrop-filter: blur(25px);
  border: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow: 0 30px 100px rgba(0, 0, 0, 0.5);
  max-width: 750px;
  opacity: 0;
}

.closing-title {
  font-size: 52px;
  font-weight: 800;
  background: linear-gradient(135deg, #ffffff 0%, rgba(255, 255, 255, 0.8) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 16px;
  opacity: 0;
}

.closing-text {
  font-size: 24px;
  color: rgba(255, 255, 255, 0.65);
  font-weight: 400;
  margin-bottom: 40px;
  opacity: 0;
}

.social-cta {
  display: flex;
  gap: 24px;
  margin-bottom: 40px;
}

.cta-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 20px 36px;
  border-radius: 18px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  cursor: pointer;
  opacity: 0;
  transform: scale(0);
}

.cta-like { border-color: rgba(99, 102, 241, 0.3); }
.cta-subscribe { border-color: rgba(239, 68, 68, 0.3); }
.cta-share { border-color: rgba(6, 182, 212, 0.3); }

.cta-icon { font-size: 32px; }

.cta-label {
  font-size: 14px;
  font-weight: 700;
  color: rgba(255,255,255,0.7);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.closing-signature {
  font-size: 16px;
  font-weight: 700;
  color: #818cf8;
  letter-spacing: 2px;
  text-transform: uppercase;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding-top: 24px;
  width: 250px;
  text-align: center;
  opacity: 0;
}

/* === Subtitles === */
.subtitle-container {
  position: absolute;
  bottom: 50px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  width: auto;
  max-width: 80%;
  pointer-events: none;
  display: flex;
  justify-content: center;
}
 
.subtitle-text {
  font-size: 24px;
  font-weight: 600;
  color: #ffffff;
  background: rgba(10, 10, 20, 0.8);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.06);
  padding: 12px 32px;
  border-radius: 100px;
  text-align: center;
  line-height: 1.4;
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.6);
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
  transition: all 0.3s ease;
}
 
.subtitle-text:empty {
  display: none;
}
`;
}

function generateAnimations(scenes: VideoScene[], script: VideoScript, audioFiles: AudioFile[]): string {
  const anims = scenes.map(scene => {
    const t = scene.startTime;
    const d = scene.duration;

    switch (scene.type) {
      case 'intro': {
        let animLines = `
  // ─── Intro (${t}s - ${(t + d).toFixed(1)}s) ───
  // Pulsing rings
  tl.fromTo('.intro-ring-1', { scale: 0, opacity: 0 }, { scale: 1, opacity: 0.3, duration: 1.5, ease: 'power2.out' }, ${t});
  tl.fromTo('.intro-ring-2', { scale: 0, opacity: 0 }, { scale: 1, opacity: 0.2, duration: 2, ease: 'power2.out' }, ${t + 0.3});
  tl.fromTo('.intro-ring-3', { scale: 0, opacity: 0 }, { scale: 1, opacity: 0.1, duration: 2.5, ease: 'power2.out' }, ${t + 0.6});
  // Particles
  tl.fromTo('.particle', { opacity: 0, scale: 0 }, { opacity: 0.6, scale: 1, duration: 0.8, stagger: { each: 0.1, from: 'random' }, ease: 'back.out(1.5)' }, ${t + 0.5});
  tl.to('.particle', { y: '-=30', x: '+=15', duration: ${d}, ease: 'none', stagger: { each: 0.2 } }, ${t});
  // Content
  tl.fromTo('.intro-badge', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.6 }, ${t + 0.3});
  tl.fromTo('.intro-title', { opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1, duration: 0.8, ease: 'back.out(1.5)' }, ${t + 0.6});
  tl.fromTo('.intro-date', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5 }, ${t + 1.2});
  tl.fromTo('.intro-author', { opacity: 0 }, { opacity: 1, duration: 0.5 }, ${t + 1.6});
  tl.fromTo('.intro-loader-fill', { width: '0%' }, { width: '100%', duration: ${d}, ease: 'none' }, ${t});
  tl.to('.scene-intro .scene-content', { opacity: 0, duration: 0.6 }, ${t + d - 0.8});
  tl.to('.intro-ring', { opacity: 0, duration: 0.5 }, ${t + d - 0.8});
  tl.to('.particle', { opacity: 0, duration: 0.3 }, ${t + d - 0.5});`;

        const chunks = getSubtitleChunks(script.intro.text, t, d);
        chunks.forEach(chunk => {
          animLines += `\n  tl.set('#subtitle-text', { innerText: ${JSON.stringify(chunk.text)} }, ${chunk.startTime.toFixed(2)});`;
        });
        if (chunks.length > 0) {
          const lastChunk = chunks[chunks.length - 1];
          animLines += `\n  tl.set('#subtitle-text', { innerText: '' }, ${(lastChunk.startTime + lastChunk.duration).toFixed(2)});`;
        }
        return animLines;
      }

      case 'toc': {
        const numItems = script.sections.length;
        const staggerDelay = Math.min(1.2, (d - 2) / numItems);
        let animLines = `
  // ─── TOC (${t}s - ${(t + d).toFixed(1)}s) ───
  tl.fromTo('.toc-header', { opacity: 0, y: -30 }, { opacity: 1, y: 0, duration: 0.6 }, ${t + 0.2});
  tl.fromTo('.toc-line', { height: 0 }, { height: '100%', duration: ${d - 1.5}, ease: 'power2.inOut' }, ${t + 0.5});`;

        for (let i = 0; i < numItems; i++) {
          const itemTime = t + 0.8 + i * staggerDelay;
          animLines += `
  tl.fromTo('#toc-item-${i + 1}', { opacity: 0, x: -40 }, { opacity: 1, x: 0, duration: 0.5, ease: 'back.out(1.3)' }, ${itemTime.toFixed(2)});`;
        }

        animLines += `
  tl.to('.toc-content', { opacity: 0, duration: 0.5 }, ${t + d - 0.6});`;

        // TOC subtitles
        const chunks = getSubtitleChunks(script.toc.text, t, d);
        chunks.forEach(chunk => {
          animLines += `\n  tl.set('#subtitle-text', { innerText: ${JSON.stringify(chunk.text)} }, ${chunk.startTime.toFixed(2)});`;
        });
        if (chunks.length > 0) {
          const lastChunk = chunks[chunks.length - 1];
          animLines += `\n  tl.set('#subtitle-text', { innerText: '' }, ${(lastChunk.startTime + lastChunk.duration).toFixed(2)});`;
        }
        return animLines;
      }

      case 'section': {
        const sIdx = scene.sectionIndex ?? 0;
        const sec = script.sections[sIdx];
        const style = getSectionStyle(sIdx);
        let animLines = `
  // ─── Section ${sIdx + 1}: ${sec.title} (${t}s - ${(t + d).toFixed(1)}s) ───
  tl.fromTo('#scene-section-${sIdx + 1} .section-badge-top', { opacity: 0, x: -30 }, { opacity: 1, x: 0, duration: 0.5 }, ${t + 0.2});`;

        switch (style) {
          case 'mindmap': {
            const highlights = sec.highlights || [];
            animLines += `
  // Mind map center node
  tl.fromTo('#mindmap-center-${sIdx + 1}', { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.8, ease: 'back.out(1.5)' }, ${t + 0.5});`;

            highlights.forEach((_, hIdx) => {
              const nodeDelay = t + 1.5 + hIdx * 0.8;
              animLines += `
  // Branch node ${hIdx + 1}
  tl.fromTo('#scene-section-${sIdx + 1} .mindmap-line-${hIdx + 1}', { strokeDashoffset: 400 }, { strokeDashoffset: 0, duration: 0.8, ease: 'power2.out' }, ${nodeDelay.toFixed(2)});
  tl.fromTo('#mindmap-node-${sIdx + 1}-${hIdx + 1}', { opacity: 0, scale: 0.5 }, { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.5)' }, ${(nodeDelay + 0.4).toFixed(2)});`;
            });

            animLines += `
  // Keep-alive: floating nodes every 3s
  tl.to('#mindmap-center-${sIdx + 1}', { scale: 1.05, duration: 1.5, yoyo: true, repeat: ${Math.floor(d / 3)}, ease: 'sine.inOut' }, ${t + 3});
  tl.to('#scene-section-${sIdx + 1} .mindmap-node', { y: '-=8', duration: 2, yoyo: true, repeat: ${Math.floor(d / 4)}, stagger: 0.3, ease: 'sine.inOut' }, ${t + 2.5});
  tl.to('#scene-section-${sIdx + 1} .mindmap-node-dot', { boxShadow: '0 0 18px rgba(99,102,241,0.9)', duration: 1, yoyo: true, repeat: ${Math.floor(d / 2)}, stagger: 0.5, ease: 'sine.inOut' }, ${t + 3});
  tl.to('#scene-section-${sIdx + 1} .mindmap-line', { opacity: 0.9, duration: 1.5, yoyo: true, repeat: ${Math.floor(d / 3)}, stagger: 0.4, ease: 'sine.inOut' }, ${t + 2});
  tl.to('#scene-section-${sIdx + 1} .mindmap-content', { opacity: 0, duration: 0.6 }, ${t + d - 0.8});`;
            break;
          }

          case 'cards': {
            const highlights = sec.highlights || [];
            animLines += `
  tl.fromTo('#section-title-${sIdx + 1}', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.6 }, ${t + 0.4});`;

            highlights.forEach((_, hIdx) => {
              const cardDelay = t + 1.2 + hIdx * 0.8;
              animLines += `
  tl.fromTo('#feature-card-${sIdx + 1}-${hIdx + 1}', { opacity: 0, rotateY: 90 }, { opacity: 1, rotateY: 0, duration: 0.7, ease: 'back.out(1.2)' }, ${cardDelay.toFixed(2)});`;
            });

            animLines += `
  // Keep-alive: card glow pulse every 3s
  tl.to('#scene-section-${sIdx + 1} .feature-card', { borderColor: 'rgba(99,102,241,0.3)', duration: 1.5, yoyo: true, repeat: ${Math.floor(d / 3)}, stagger: 0.4, ease: 'sine.inOut' }, ${t + 3});
  tl.to('#scene-section-${sIdx + 1} .feature-card-icon', { scale: 1.2, duration: 1, yoyo: true, repeat: ${Math.floor(d / 2)}, stagger: 0.5, ease: 'sine.inOut' }, ${t + 3.5});
  tl.to('#scene-section-${sIdx + 1} .feature-card-line', { width: 80, duration: 2, yoyo: true, repeat: ${Math.floor(d / 4)}, stagger: 0.3, ease: 'sine.inOut' }, ${t + 2.5});
  tl.to('#scene-section-${sIdx + 1} .cards-content', { opacity: 0, duration: 0.6 }, ${t + d - 0.8});`;
            break;
          }

          case 'comparison': {
            const highlights = sec.highlights || [];
            animLines += `
  tl.fromTo('#section-title-${sIdx + 1}', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.6 }, ${t + 0.4});`;

            highlights.forEach((_, hIdx) => {
              const rowDelay = t + 1.2 + hIdx * 0.8;
              const barWidths = ['85%', '72%', '90%'];
              animLines += `
  tl.fromTo('#comp-row-${sIdx + 1}-${hIdx + 1}', { opacity: 0, x: ${hIdx % 2 === 0 ? -60 : 60} }, { opacity: 1, x: 0, duration: 0.6, ease: 'power3.out' }, ${rowDelay.toFixed(2)});
  tl.to('#comp-row-${sIdx + 1}-${hIdx + 1} .comp-bar-fill', { width: '${barWidths[hIdx % barWidths.length]}', duration: 1, ease: 'power2.out' }, ${(rowDelay + 0.3).toFixed(2)});
  tl.fromTo('#comp-row-${sIdx + 1}-${hIdx + 1} .comp-check', { opacity: 0, scale: 0 }, { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(2)' }, ${(rowDelay + 0.8).toFixed(2)});`;
            });

            animLines += `
  // Keep-alive: bar width pulse and row highlight every 3s
  tl.to('#scene-section-${sIdx + 1} .comparison-row', { backgroundColor: 'rgba(99,102,241,0.08)', duration: 1.5, yoyo: true, repeat: ${Math.floor(d / 3)}, stagger: 0.5, ease: 'sine.inOut' }, ${t + 3.5});
  tl.to('#scene-section-${sIdx + 1} .comp-check', { scale: 1.2, duration: 0.8, yoyo: true, repeat: ${Math.floor(d / 2)}, stagger: 0.4, ease: 'sine.inOut' }, ${t + 4});
  tl.to('#scene-section-${sIdx + 1} .comparison-content', { opacity: 0, duration: 0.6 }, ${t + d - 0.8});`;
            break;
          }

          case 'checklist': {
            const highlights = sec.highlights || [];
            animLines += `
  tl.fromTo('#section-title-${sIdx + 1}', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.6 }, ${t + 0.4});
  tl.fromTo('#scene-section-${sIdx + 1} .checklist-shield', { opacity: 0, scale: 0 }, { opacity: 1, scale: 1, duration: 0.8, ease: 'elastic.out(1, 0.5)' }, ${t + 0.6});`;

            highlights.forEach((_, hIdx) => {
              const itemDelay = t + 1.8 + hIdx * 1.0;
              animLines += `
  tl.fromTo('#check-item-${sIdx + 1}-${hIdx + 1}', { opacity: 0, x: -40 }, { opacity: 1, x: 0, duration: 0.5, ease: 'power3.out' }, ${itemDelay.toFixed(2)});
  tl.to('#check-item-${sIdx + 1}-${hIdx + 1} .check-path', { strokeDashoffset: 0, duration: 0.4, ease: 'power2.out' }, ${(itemDelay + 0.4).toFixed(2)});
  tl.to('#check-item-${sIdx + 1}-${hIdx + 1} .check-box', { borderColor: '#22c55e', background: 'rgba(34, 197, 94, 0.15)', duration: 0.3 }, ${(itemDelay + 0.4).toFixed(2)});`;
            });

            animLines += `
  // Keep-alive: shield pulse and item emphasis every 3s
  tl.to('#shield-icon-${sIdx + 1}', { scale: 1.1, duration: 1.5, yoyo: true, repeat: ${Math.floor(d / 3)}, ease: 'sine.inOut' }, ${t + 3});
  tl.to('#scene-section-${sIdx + 1} .checklist-item', { backgroundColor: 'rgba(34,197,94,0.06)', duration: 1.5, yoyo: true, repeat: ${Math.floor(d / 3)}, stagger: 0.4, ease: 'sine.inOut' }, ${t + 4});
  tl.to('#scene-section-${sIdx + 1} .check-box', { scale: 1.1, duration: 0.8, yoyo: true, repeat: ${Math.floor(d / 2)}, stagger: 0.3, ease: 'sine.inOut' }, ${t + 3.5});
  tl.to('#scene-section-${sIdx + 1} .checklist-content', { opacity: 0, duration: 0.6 }, ${t + d - 0.8});`;
            break;
          }
        }

        // Subtitles for this section
        const chunks = getSubtitleChunks(sec.narration, t, d);
        chunks.forEach(chunk => {
          animLines += `\n  tl.set('#subtitle-text', { innerText: ${JSON.stringify(chunk.text)} }, ${chunk.startTime.toFixed(2)});`;
        });
        if (chunks.length > 0) {
          const lastChunk = chunks[chunks.length - 1];
          animLines += `\n  tl.set('#subtitle-text', { innerText: '' }, ${(lastChunk.startTime + lastChunk.duration).toFixed(2)});`;
        }
        return animLines;
      }

      case 'summary': {
        let animLines = `
  // ─── Summary (${t}s - ${(t + d).toFixed(1)}s) ───
  tl.fromTo('.summary-header', { opacity: 0, y: -30 }, { opacity: 1, y: 0, duration: 0.6 }, ${t + 0.2});
  tl.fromTo('.summary-dashboard', { opacity: 0 }, { opacity: 1, duration: 0.4 }, ${t + 0.5});
  tl.fromTo('.radial-stat', { opacity: 0, scale: 0.5 }, { opacity: 1, scale: 1, duration: 0.6, stagger: 0.2, ease: 'back.out(1.5)' }, ${t + 0.6});
  // Radial ring animations
  tl.to('.radial-fill-1', { strokeDashoffset: ${327 - 327 * 0.75}, duration: 1.5, ease: 'power2.out' }, ${t + 1.0});
  tl.to('.radial-fill-2', { strokeDashoffset: ${327 - 327 * 0.6}, duration: 1.5, ease: 'power2.out' }, ${t + 1.2});
  tl.to('.radial-fill-3', { strokeDashoffset: ${327 - 327 * 0.45}, duration: 1.5, ease: 'power2.out' }, ${t + 1.4});
  tl.to('.radial-fill-4', { strokeDashoffset: ${327 - 327 * 0.55}, duration: 1.5, ease: 'power2.out' }, ${t + 1.6});
  // Keep-alive: radial stat pulse every 3s
  tl.to('.radial-stat', { scale: 1.05, duration: 1.5, yoyo: true, repeat: ${Math.floor(d / 3)}, stagger: 0.3, ease: 'sine.inOut' }, ${t + 3});
  tl.to('.radial-number', { color: '#a5b4fc', duration: 1, yoyo: true, repeat: ${Math.floor(d / 2)}, stagger: 0.4, ease: 'sine.inOut' }, ${t + 3.5});
  tl.to('.summary-content', { opacity: 0, duration: 0.5 }, ${t + d - 0.8});`;

        const chunks = getSubtitleChunks(script.summary.text, t, d);
        chunks.forEach(chunk => {
          animLines += `\n  tl.set('#subtitle-text', { innerText: ${JSON.stringify(chunk.text)} }, ${chunk.startTime.toFixed(2)});`;
        });
        if (chunks.length > 0) {
          const lastChunk = chunks[chunks.length - 1];
          animLines += `\n  tl.set('#subtitle-text', { innerText: '' }, ${(lastChunk.startTime + lastChunk.duration).toFixed(2)});`;
        }
        return animLines;
      }

      case 'closing': {
        let animLines = `
  // ─── Closing (${t}s - ${(t + d).toFixed(1)}s) ───
  tl.fromTo('.closing-card', { opacity: 0, y: 50, scale: 0.92 }, { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: 'back.out(1.3)' }, ${t + 0.2});
  tl.fromTo('#closing-title', { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.5 }, ${t + 0.5});
  tl.fromTo('#closing-text', { opacity: 0, y: 15 }, { opacity: 1, y: 0, duration: 0.5 }, ${t + 0.8});
  // Social CTA buttons - spring entrance
  tl.fromTo('#cta-like', { opacity: 0, scale: 0 }, { opacity: 1, scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.4)' }, ${t + 1.2});
  tl.fromTo('#cta-subscribe', { opacity: 0, scale: 0 }, { opacity: 1, scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.4)' }, ${t + 1.5});
  tl.fromTo('#cta-share', { opacity: 0, scale: 0 }, { opacity: 1, scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.4)' }, ${t + 1.8});
  tl.fromTo('.closing-signature', { opacity: 0, width: 0 }, { opacity: 0.8, width: 250, duration: 0.8, ease: 'power2.out' }, ${t + 2.2});
  // Keep-alive: CTA button bounce every 3s
  tl.to('.cta-btn', { y: -5, duration: 0.8, yoyo: true, repeat: ${Math.floor(d / 2)}, stagger: 0.2, ease: 'sine.inOut' }, ${t + 3});
  tl.to('.cta-icon', { scale: 1.15, duration: 0.6, yoyo: true, repeat: ${Math.floor(d / 1.5)}, stagger: 0.3, ease: 'sine.inOut' }, ${t + 3.5});
  tl.to('.closing-card', { opacity: 0, scale: 0.9, duration: 0.8, ease: 'power2.in' }, ${t + d - 1.0});`;

        const chunks = getSubtitleChunks(script.closing.text, t, d);
        chunks.forEach(chunk => {
          animLines += `\n  tl.set('#subtitle-text', { innerText: ${JSON.stringify(chunk.text)} }, ${chunk.startTime.toFixed(2)});`;
        });
        if (chunks.length > 0) {
          const lastChunk = chunks[chunks.length - 1];
          animLines += `\n  tl.set('#subtitle-text', { innerText: '' }, ${(lastChunk.startTime + lastChunk.duration).toFixed(2)});`;
        }
        return animLines;
      }

      default:
        return '';
    }
  });

  return `// Tech Review Video - GSAP Animations
// Auto-generated by compose-video.ts
 
const tl = gsap.timeline({ paused: true });
 
${anims.join('\n')}
 
// Register timeline for HyperFrames
window.__timelines = window.__timelines || {};
window.__timelines["tech-review"] = tl;
`;
}

interface SubtitleChunk {
  text: string;
  startTime: number;
  duration: number;
}

function getSubtitleChunks(text: string, segmentStart: number, segmentDuration: number): SubtitleChunk[] {
  const cleanText = text.replace(/\[.*?\]/g, '').replace(/\*\*/g, '').trim();
  if (!cleanText) return [];

  const parts = cleanText.split(/(?<=[,?.!;:])\s+/);
  const rawChunks: string[] = [];

  for (const part of parts) {
    const words = part.split(/\s+/).filter(Boolean);
    if (words.length === 0) continue;

    const maxWordsPerChunk = 5;
    if (words.length > maxWordsPerChunk) {
      for (let i = 0; i < words.length; i += maxWordsPerChunk) {
        rawChunks.push(words.slice(i, i + maxWordsPerChunk).join(' '));
      }
    } else {
      rawChunks.push(part);
    }
  }

  if (rawChunks.length === 0) return [];

  const weights = rawChunks.map(c => c.replace(/\s+/g, '').length || 1);
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  const chunks: SubtitleChunk[] = [];
  const startPadding = 0.3;
  const endPadding = 0.3;
  const availableDuration = Math.max(0.5, segmentDuration - startPadding - endPadding);

  let currentTime = segmentStart + startPadding;

  for (let i = 0; i < rawChunks.length; i++) {
    const chunkDuration = (weights[i] / totalWeight) * availableDuration;
    chunks.push({
      text: rawChunks[i].trim(),
      startTime: currentTime,
      duration: chunkDuration,
    });
    currentTime += chunkDuration;
  }

  return chunks;
}
