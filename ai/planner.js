import {
  detectKeywords,
  extractColor,
  extractOpacity,
  extractCount,
  extractTextContent,
  extractFontSize,
  extractStrokeWidth,
  extractPalette,
  normalizeText,
} from './parse.js';

export function buildPlan(payload) {
  const { userRequest, artboard, animationDuration, elementToAnimate, existingElements } = payload || {};
  const text = userRequest || '';
  const keywords = detectKeywords(text);
  const wantsCreate = keywords.add || keywords.makeA || /new\b/.test(normalizeText(text));

  let wantsScene = !!(
    keywords.scene || keywords.sunset || keywords.ocean || keywords.city || keywords.forest ||
    keywords.mountain || keywords.desert || keywords.space || keywords.studio || keywords.neon ||
    keywords.night || keywords.snow || keywords.rain || keywords.clouds || keywords.stars ||
    keywords.moon || keywords.meadow || keywords.lake || keywords.river
  );
  if (keywords.existing && Array.isArray(existingElements) && existingElements.length > 0) {
    wantsScene = false;
  }

  const wantsCharacter = !!(keywords.character || keywords.robot || keywords.animal);
  const wantsPhoto = !!(keywords.photo || (elementToAnimate?.type === 'image' && (keywords.animate || keywords.kenBurns || keywords.parallax)));
  const wantsPath = !!(
    keywords.path || keywords.blob || (keywords.wavePath && !wantsCharacter) || keywords.spiral ||
    keywords.heart || keywords.starShape || keywords.polygon || keywords.zigzag
  );

  const sceneType = keywords.sunset
    ? 'sunset'
    : keywords.ocean
      ? 'ocean'
      : keywords.city
        ? 'city'
        : keywords.forest
          ? 'forest'
          : keywords.mountain
            ? 'mountain'
            : keywords.desert
              ? 'desert'
              : keywords.space
                ? 'space'
                : keywords.studio || keywords.neon
                  ? 'neonStudio'
                  : keywords.meadow
                    ? 'meadow'
                    : wantsScene
                      ? 'scene'
                      : wantsCharacter
                        ? 'character'
                        : 'basic';

  const layout = keywords.grid ? 'grid' : keywords.column ? 'column' : 'row';
  const motionPreset = keywords.walk
    ? 'walk'
    : keywords.wave
      ? 'wave'
      : keywords.idle || keywords.float
        ? 'idle'
        : keywords.bounce
          ? 'bounce'
          : keywords.spin
            ? 'spin'
            : keywords.pulse
              ? 'pulse'
              : null;

  const style = keywords.neon
    ? 'neon'
    : keywords.pastel
      ? 'pastel'
      : keywords.minimal
        ? 'minimal'
        : keywords.bold
          ? 'bold'
          : keywords.outline
            ? 'outline'
            : keywords.flat
              ? 'flat'
              : 'default';

  const duration = Math.max(2, animationDuration || 4);
  const beats = {
    intro: { start: 0, end: duration * 0.25 },
    action: { start: duration * 0.25, end: duration * 0.8 },
    settle: { start: duration * 0.8, end: duration },
  };

  const cameraMotion = !!(keywords.camera || keywords.pan || keywords.zoom || keywords.kenBurns || keywords.parallax);
  const weather = keywords.rain ? 'rain' : keywords.snow ? 'snow' : null;

  const defaultPalettes = {
    sunset: ['#f97316', '#fbbf24', '#fb7185', '#0f172a'],
    ocean: ['#0ea5e9', '#38bdf8', '#0f172a', '#f8fafc'],
    city: ['#0f172a', '#1f2937', '#38bdf8', '#f8fafc'],
    forest: ['#065f46', '#16a34a', '#a3e635', '#0f172a'],
    mountain: ['#334155', '#64748b', '#e2e8f0', '#0f172a'],
    desert: ['#f59e0b', '#fbbf24', '#f97316', '#1f2937'],
    space: ['#0b1020', '#312e81', '#38bdf8', '#f472b6'],
    neonStudio: ['#0b1020', '#22d3ee', '#a855f7', '#f472b6'],
    meadow: ['#16a34a', '#4ade80', '#fde047', '#1f2937'],
    scene: ['#0f172a', '#38bdf8', '#facc15', '#22c55e'],
    basic: ['#3b82f6', '#22c55e', '#f97316'],
  };

  const palette = extractPalette(text, defaultPalettes[sceneType] || defaultPalettes.basic);

  return {
    text,
    sceneType,
    layout,
    duration,
    beats,
    wantsScene,
    wantsCharacter,
    wantsPhoto,
    wantsPath,
    wantsPhotoTier2: wantsPhoto && (keywords.subject || keywords.boundingBox || keywords.foreground || keywords.background),
    motionPreset,
    style,
    cameraMotion,
    weather,
    wantsCreate,
    targetSelected: !!elementToAnimate?.id,
    color: extractColor(text),
    palette,
    opacity: extractOpacity(text),
    strokeWidth: extractStrokeWidth(text),
    count: extractCount(text),
    textContent: extractTextContent(text),
    fontSize: extractFontSize(text),
    keywords,
    artboard: {
      width: artboard?.width ?? 800,
      height: artboard?.height ?? 600,
    },
    existingElements: Array.isArray(existingElements) ? existingElements : [],
    selectedElement: elementToAnimate || null,
    imageHref: elementToAnimate?.href || null,
  };
}
