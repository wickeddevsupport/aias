

import { SVGElementData, Animation, AnimatableProperty, Artboard, CircleElementProps, PathElementProps, RectElementProps, GroupElementProps, TextElementProps, ImageElementProps, GradientStop, LinearSVGGradient, RadialSVGGradient, BezierPoint } from './types';
import { colord } from 'colord'; // Keep colord for potential future use or complex scenarios, not strictly needed for this simplified version if only solid colors.

export const DEFAULT_ELEMENT_STROKE = '#a0aec0'; // gray-500
export const DEFAULT_ELEMENT_FILL = '#4299e1'; // blue-500
export const DEFAULT_PATH_FILL = '#63b3ed'; // blue-400
export const DEFAULT_STROKE_WIDTH = 2;
export const DEFAULT_OPACITY = 1;
export const DEFAULT_ROTATION = 0;
export const DEFAULT_SCALE = 1;
export const DEFAULT_SKEW_X = 0; // Added
export const DEFAULT_SKEW_Y = 0; // Added
export const DEFAULT_NAME = 'Element';
export const DEFAULT_GROUP_NAME = 'Group';
export const DEFAULT_MOTION_PATH_START = 0;
export const DEFAULT_MOTION_PATH_END = 1;
export const DEFAULT_MOTION_PATH_OFFSET_X = 0;
export const DEFAULT_MOTION_PATH_OFFSET_Y = 0;

// Default transform for groups
export const DEFAULT_GROUP_X = 0;
export const DEFAULT_GROUP_Y = 0;
export const DEFAULT_GROUP_ROTATION = 0;
export const DEFAULT_GROUP_SCALE = 1;
export const DEFAULT_GROUP_SKEW_X = 0; // Added
export const DEFAULT_GROUP_SKEW_Y = 0; // Added


// Default Ellipse Radii (used if CircleElementProps represents an ellipse)
export const DEFAULT_ELLIPSE_RX = 40;
export const DEFAULT_ELLIPSE_RY = 25;
export const DEFAULT_CIRCLE_R = 30; // For when it's truly a circle

// Default gradient values (not used in this simplified version, but kept for structure)
export const DEFAULT_GRADIENT_ANGLE = 0;
export const DEFAULT_GRADIENT_STOPS: GradientStop[] = [
  { id: `stop-${Date.now()}-1`, offset: 0, color: 'rgba(0,0,0,1)' },
  { id: `stop-${Date.now()}-2`, offset: 1, color: 'rgba(255,255,255,1)' },
];
export const DEFAULT_RADIAL_CX = '50%';
export const DEFAULT_RADIAL_CY = '50%';
export const DEFAULT_RADIAL_R = '50%';
export const DEFAULT_RADIAL_FX = '50%';
export const DEFAULT_RADIAL_FY = '50%';
export const DEFAULT_RADIAL_FR = '0%';

// Text Element Defaults
export const DEFAULT_TEXT_CONTENT = "\u200B"; // Zero-width space for initial edit
export const DEFAULT_FONT_FAMILY = 'Roboto, Arial, sans-serif'; // Updated default
export const DEFAULT_FONT_SIZE = 24; // Increased default size
export const DEFAULT_FONT_WEIGHT = 'normal';
export const DEFAULT_FONT_STYLE = 'normal';
export const DEFAULT_TEXT_ANCHOR = 'start';
export const DEFAULT_TEXT_VERTICAL_ALIGN = 'top'; // Konva uses this. SVG's dominant-baseline is more complex.
export const DEFAULT_LETTER_SPACING = 0;
export const DEFAULT_LINE_HEIGHT = 1.2; // Multiplier
export const DEFAULT_TEXT_DECORATION = 'none'; // 'none', 'underline', 'line-through', 'underline line-through'
export const DEFAULT_TEXT_WRAP: TextElementProps['wrap'] = 'word'; // Default wrap mode
export const DEFAULT_TEXT_ALIGN_KONVA: TextElementProps['align'] = 'left'; // Default Konva alignment


// Image Element Defaults
export const DEFAULT_IMAGE_HREF = 'https://via.placeholder.com/100x80/cccccc/666666?text=Image'; // Placeholder if no href provided
export const DEFAULT_IMAGE_PRESERVE_ASPECT_RATIO = 'xMidYMid meet';

// Font Options for Properties Panel
export const FONT_WEIGHT_OPTIONS = [
  { value: 'normal', label: 'Normal' }, { value: 'bold', label: 'Bold' },
  { value: '100', label: '100' }, { value: '200', label: '200' }, { value: '300', label: '300' },
  { value: '400', label: '400 (Normal)' }, { value: '500', label: '500' }, { value: '600', label: '600' },
  { value: '700', label: '700 (Bold)' }, { value: '800', label: '800' }, { value: '900', label: '900' },
];
export const FONT_STYLE_OPTIONS = [
  { value: 'normal', label: 'Normal' }, { value: 'italic', label: 'Italic' }
];
export const TEXT_ANCHOR_OPTIONS: { value: 'start' | 'middle' | 'end'; label: string }[] = [
  { value: 'start', label: 'Start' }, { value: 'middle', label: 'Middle' }, { value: 'end', label: 'End' }
];
export const TEXT_VERTICAL_ALIGN_OPTIONS: { value: 'top' | 'middle' | 'bottom' | 'baseline'; label: string }[] = [
  { value: 'top', label: 'Top' }, { value: 'middle', label: 'Middle' }, { value: 'bottom', label: 'Bottom' }, { value: 'baseline', label: 'Baseline (SVG default)' } // Updated label for clarity
];
export const TEXT_WRAP_OPTIONS: { value: NonNullable<TextElementProps['wrap']>; label: string }[] = [
    { value: 'word', label: 'Word Wrap' },
    { value: 'char', label: 'Character Wrap' },
    { value: 'none', label: 'No Wrap' },
];
export const TEXT_ALIGN_KONVA_OPTIONS: { value: NonNullable<TextElementProps['align']>; label: string }[] = [
    { value: 'left', label: 'Left' },
    { value: 'center', label: 'Center' },
    { value: 'right', label: 'Right' },
    { value: 'justify', label: 'Justify' },
];


export const COMMON_FONT_FAMILIES = [
  // Sans-serif
  'Roboto, sans-serif',
  'Open Sans, sans-serif',
  'Lato, sans-serif',
  'Montserrat, sans-serif',
  'Oswald, sans-serif',
  'Raleway, sans-serif',
  'PT Sans, sans-serif',
  'Ubuntu, sans-serif',
  'Noto Sans, sans-serif',
  'Bebas Neue, cursive',
  'Anton, sans-serif',
  // Serif
  'Merriweather, serif',
  'PT Serif, serif',
  'Playfair Display, serif',
  'Lora, serif',
  'Arvo, serif',
  // Monospace
  'Inconsolata, monospace',
  'Source Code Pro, monospace',
  'Fira Code, monospace',
  // Handwriting/Script
  'Dancing Script, cursive',
  'Pacifico, cursive',
  'Indie Flower, cursive',
  'Caveat, cursive',
  'Lobster, cursive',
  'Shadows Into Light, cursive',
  // Other
  'Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif',
  // Web-safe fallbacks (already present, kept for completeness)
  'Arial, Helvetica, sans-serif',
  'Verdana, Geneva, sans-serif',
  'Tahoma, Geneva, sans-serif',
  'Georgia, serif',
  '"Times New Roman", Times, serif',
  '"Courier New", Courier, monospace',
  '"Lucida Console", Monaco, monospace',
];


// Preserve Aspect Ratio Options for Properties Panel
export const PRESERVE_ASPECT_RATIO_OPTIONS = [
  { value: 'none', label: 'None (stretch)' },
  { value: 'xMinYMin meet', label: 'xMinYMin meet' }, { value: 'xMidYMin meet', label: 'xMidYMin meet' }, { value: 'xMaxYMin meet', label: 'xMaxYMin meet' },
  { value: 'xMinYMid meet', label: 'xMinYMid meet' }, { value: 'xMidYMid meet', label: 'xMidYMid meet (default)' }, { value: 'xMaxYMid meet', label: 'xMaxYMid meet' },
  { value: 'xMinYMax meet', label: 'xMinYMax meet' }, { value: 'xMidYMax meet', label: 'xMidYMax meet' }, { value: 'xMaxYMax meet', label: 'xMaxYMax meet' },
  { value: 'xMinYMin slice', label: 'xMinYMin slice' }, { value: 'xMidYMin slice', label: 'xMidYMin slice' }, { value: 'xMaxYMin slice', label: 'xMaxYMin slice' },
  { value: 'xMinYMid slice', label: 'xMinYMid slice' }, { value: 'xMidYMid slice', label: 'xMidYMid slice' }, { value: 'xMaxYMid slice', label: 'xMaxYMid slice' },
  { value: 'xMinYMax slice', label: 'xMinYMax slice' }, { value: 'xMidYMax slice', label: 'xMidYMax slice' }, { value: 'xMaxYMax slice', label: 'xMaxYMax slice' },
];

// NEW DEFAULT ANIMATION CONSTANTS
export const INITIAL_ARTBOARDS: Artboard[] = [
  {
    id: 'artboard-spectacle-v1',
    name: 'Visual Spectacle',
    x: 0, y: 0, width: 800, height: 600,
    backgroundColor: '#1a202c', // Very dark blue-gray
    defs: { gradients: [] },
  }
];

const ARTBOARD_ID = INITIAL_ARTBOARDS[0].id;
const ANIMATION_DURATION = 20; // seconds

// --- BezierPoint Definitions for Animated Shapes ---
const star4Points: BezierPoint[] = [
    { id: 'morph_p0', x: 0, y: -25, h1x: 5, h1y: -15, h2x: -5, h2y: -15, isSmooth: true },
    { id: 'morph_p1', x: 25, y: 0, h1x: 15, h1y: 5, h2x: 15, h2y: -5, isSmooth: true },
    { id: 'morph_p2', x: 0, y: 25, h1x: -5, h1y: 15, h2x: 5, h2y: 15, isSmooth: true },
    { id: 'morph_p3', x: -25, y: 0, h1x: -15, h1y: -5, h2x: -15, h2y: 5, isSmooth: true }
];
const square4PointsSmooth: BezierPoint[] = [
  { id: 'morph_p0', x: -20, y: -20, h1x: -20, h1y: -10, h2x: -10, h2y: -20, isSmooth: true },
  { id: 'morph_p1', x: 20, y: -20, h1x: 10, h1y: -20, h2x: 20, h2y: -10, isSmooth: true },
  { id: 'morph_p2', x: 20, y: 20, h1x: 20, h1y: 10, h2x: 10, h2y: 20, isSmooth: true },
  { id: 'morph_p3', x: -20, y: 20, h1x: -10, h1y: 20, h2x: -20, h2y: 10, isSmooth: true }
];
const diamond4Points: BezierPoint[] = [ // Another shape for morphing
  { id: 'morph_p0', x: 0, y: -30, h1x: 10, h1y: -30, h2x: -10, h2y: -30, isSmooth: true },
  { id: 'morph_p1', x: 30, y: 0,  h1x: 30, h1y: 10, h2x: 30, h2y: -10, isSmooth: true },
  { id: 'morph_p2', x: 0, y: 30,  h1x: -10, h1y: 30, h2x: 10, h2y: 30, isSmooth: true },
  { id: 'morph_p3', x: -30, y: 0, h1x: -30, h1y: -10, h2x: -30, h2y: 10, isSmooth: true }
];

const shootingStarShapePoints: BezierPoint[] = [ // 8-point star for 'star1'
  { id: 's1_p0', x: 0, y: -15, h1x: 0, h1y: -15, h2x: 0, h2y: -15, isSmooth: false },
  { id: 's1_p1', x: 5, y: -5, h1x: 5, h1y: -5, h2x: 5, h2y: -5, isSmooth: false },
  { id: 's1_p2', x: 15, y: 0, h1x: 15, h1y: 0, h2x: 15, h2y: 0, isSmooth: false },
  { id: 's1_p3', x: 5, y: 5, h1x: 5, h1y: 5, h2x: 5, h2y: 5, isSmooth: false },
  { id: 's1_p4', x: 0, y: 15, h1x: 0, h1y: 15, h2x: 0, h2y: 15, isSmooth: false },
  { id: 's1_p5', x: -5, y: 5, h1x: -5, h1y: 5, h2x: -5, h2y: 5, isSmooth: false },
  { id: 's1_p6', x: -15, y: 0, h1x: -15, h1y: 0, h2x: -15, h2y: 0, isSmooth: false },
  { id: 's1_p7', x: -5, y: -5, h1x: -5, h1y: -5, h2x: -5, h2y: -5, isSmooth: false }
];
const streakShapePoints: BezierPoint[] = [ // For 'star2'
  { id: 'stk_p0', x: 0, y: -3, h1x: 0, h1y: -3, h2x: 0, h2y: -3, isSmooth: false },
  { id: 'stk_p1', x: 25, y: 0, h1x: 25, h1y: 0, h2x: 25, h2y: 0, isSmooth: false },
  { id: 'stk_p2', x: 0, y: 3, h1x: 0, h1y: 3, h2x: 0, h2y: 3, isSmooth: false }
];


export const INITIAL_ELEMENTS: SVGElementData[] = [
  // 0. Background Rect
  {
    id: 'background-main', artboardId: ARTBOARD_ID, type: 'rect', name: 'Background', parentId: null, order: 0,
    x: 0, y: 0, width: 800, height: 600, fill: '#1a202c',
    stroke: 'none', strokeWidth: 0, opacity: 1, rotation: 0, scale: 1, skewX: 0, skewY: 0,
  } as RectElementProps,

  // 1. Cosmic Orb Group
  {
    id: 'cosmic-orb-group', artboardId: ARTBOARD_ID, type: 'group', name: 'Cosmic Orb', parentId: null, order: 1,
    x: 400, y: 300, opacity: 1, rotation: 0, scale: 1, skewX: 0, skewY: 0,
  } as GroupElementProps,
  { // Orb Core
    id: 'orb-core', artboardId: ARTBOARD_ID, type: 'circle', name: 'Orb Core', parentId: 'cosmic-orb-group', order: 0,
    x: 0, y: 0, r: 30, // rx/ry will default to r if not specified
    fill: '#FFFF00', // Yellow
    stroke: 'none', strokeWidth: 0, opacity: 0.8, rotation: 0, scale: 1, skewX: 0, skewY: 0,
  } as CircleElementProps,
  { // Orb Ring 1
    id: 'orb-ring1', artboardId: ARTBOARD_ID, type: 'path', name: 'Orb Ring 1', parentId: 'cosmic-orb-group', order: 1,
    x: 0, y: 0, d: 'M0,-50 A50,50 0 1,0 0,50 A50,50 0 1,0 0,-50 Z',
    fill: 'none', stroke: '#00FFFF', strokeWidth: 2, opacity: 1, rotation: 0, scale: 1, skewX: 0, skewY: 0, // Cyan
  } as PathElementProps,
  { // Orb Ring 2
    id: 'orb-ring2', artboardId: ARTBOARD_ID, type: 'path', name: 'Orb Ring 2', parentId: 'cosmic-orb-group', order: 2,
    x: 0, y: 0, d: 'M0,-70 A70,70 0 1,0 0,70 A70,70 0 1,0 0,-70 Z',
    fill: 'none', stroke: '#FF00FF', strokeWidth: 1.5, opacity: 1, rotation: 0, scale: 1, skewX: 0, skewY: 0, // Magenta
  } as PathElementProps,
   { // Orb Ring 3
    id: 'orb-ring3', artboardId: ARTBOARD_ID, type: 'path', name: 'Orb Ring 3', parentId: 'cosmic-orb-group', order: 3,
    x: 0, y: 0, d: 'M0,-90 A90,90 0 1,0 0,90 A90,90 0 1,0 0,-90 Z',
    fill: 'none', stroke: '#32CD32', strokeWidth: 1, opacity: 1, rotation: 0, scale: 1, skewX: 0, skewY: 0, // LimeGreen
  } as PathElementProps,

  // 2. Motion Paths (Faintly visible for debugging, could be isRendered: false)
  {
    id: 'star-motion-path1', artboardId: ARTBOARD_ID, type: 'path', name: 'Star Motion Path 1', parentId: null, order: 0.1,
    x: 0, y: 0, d: 'M50,50 Q400,50 750,550', // Positioned absolutely by its 'd'
    fill: 'none', stroke: 'rgba(100,100,100,0.15)', strokeWidth: 1, isRendered: true, skewX: 0, skewY: 0,
  } as PathElementProps,
  {
    id: 'star-motion-path2', artboardId: ARTBOARD_ID, type: 'path', name: 'Star Motion Path 2', parentId: null, order: 0.2,
    x: 0, y: 0, d: 'M50,150 C 150,50 250,250 350,150 S 550,50 650,150 T 750,150',
    fill: 'none', stroke: 'rgba(100,100,100,0.15)', strokeWidth: 1, isRendered: true, skewX: 0, skewY: 0,
  } as PathElementProps,

  // 3. Shooting Stars Group (elements within will use motion paths, group itself can be static)
  {
    id: 'shooting-stars-group', artboardId: ARTBOARD_ID, type: 'group', name: 'Shooting Stars', parentId: null, order: 2,
    x: 0, y: 0, opacity: 1, rotation: 0, scale: 1, skewX: 0, skewY: 0,
  } as GroupElementProps,
  { // Star 1
    id: 'star1', artboardId: ARTBOARD_ID, type: 'path', name: 'Shooting Star 1', parentId: 'shooting-stars-group', order: 0,
    x: 0, y: 0, d: shootingStarShapePoints, structuredPoints: shootingStarShapePoints, closedByJoining: true,
    fill: '#FFFFFF', stroke: 'none', opacity: 0, rotation: 0, scale: 0.2, skewX: 0, skewY: 0,
    motionPathId: 'star-motion-path1', alignToPath: true,
  } as PathElementProps,
  { // Star 2 (Streak)
    id: 'star2', artboardId: ARTBOARD_ID, type: 'path', name: 'Shooting Star 2', parentId: 'shooting-stars-group', order: 1,
    x: 0, y: 0, d: streakShapePoints, structuredPoints: streakShapePoints, closedByJoining: true,
    fill: '#ADD8E6', stroke: 'none', opacity: 0, rotation: 0, scale: 0.1, skewX: 0, skewY: 0, // Light Blue
    motionPathId: 'star-motion-path2', alignToPath: true,
  } as PathElementProps,

  // 4. Geometric Dance Group
  {
    id: 'geometric-dance-group', artboardId: ARTBOARD_ID, type: 'group', name: 'Geometric Dance', parentId: null, order: 3,
    x: 150, y: 450, opacity: 1, rotation: 0, scale: 1, skewX: 0, skewY: 0,
  } as GroupElementProps,
  { // Morph Shape
    id: 'morph-shape', artboardId: ARTBOARD_ID, type: 'path', name: 'Morphing Shape', parentId: 'geometric-dance-group', order: 0,
    x: 0, y: 0, d: star4Points, structuredPoints: star4Points, closedByJoining: true,
    fill: '#800080', stroke: '#4B0082', strokeWidth: 1, opacity: 1, rotation: 0, scale: 1, skewX: 0, skewY: 0, // Purple
  } as PathElementProps,
  { // Satellite Rect
    id: 'geo-rect', artboardId: ARTBOARD_ID, type: 'rect', name: 'Geo Rect', parentId: 'geometric-dance-group', order: 1,
    x: -70, y: 0, width: 20, height: 20, fill: '#FFA500', // Orange
    stroke: 'none', strokeWidth: 0, opacity: 1, rotation: 0, scale: 1, skewX: 0, skewY: 0,
  } as RectElementProps,
  { // Satellite Circle
    id: 'geo-circle', artboardId: ARTBOARD_ID, type: 'circle', name: 'Geo Circle', parentId: 'geometric-dance-group', order: 2,
    x: 70, y: 0, r: 10, fill: '#008000', // Green
    stroke: 'none', strokeWidth: 0, opacity: 1, rotation: 0, scale: 1, skewX: 0, skewY: 0,
  } as CircleElementProps,

  // 5. Title Text
  {
    id: 'title-text', artboardId: ARTBOARD_ID, type: 'text', name: 'Title Text', parentId: null, order: 4,
    x: 400, y: 100, text: 'SPECTACLE', fontFamily: 'Impact, sans-serif', fontSize: 60, textAnchor: 'middle',
    fill: '#FFD700', stroke: '#000000', strokeWidth: 1, opacity: 1, rotation: 0, scale: 1, skewX: 0, skewY: 0, // Gold
    letterSpacing: DEFAULT_LETTER_SPACING, lineHeight: DEFAULT_LINE_HEIGHT, textDecoration: DEFAULT_TEXT_DECORATION,
    width: undefined, height: undefined, align: DEFAULT_TEXT_ALIGN_KONVA, wrap: DEFAULT_TEXT_WRAP, // Added new text defaults
  } as TextElementProps,
];

export const INITIAL_ANIMATION: Animation = {
  duration: ANIMATION_DURATION,
  tracks: [
    // Cosmic Orb Group
    { elementId: 'cosmic-orb-group', property: 'rotation', keyframes: [
        { time: 0, value: 0, easing: 'linear' }, { time: ANIMATION_DURATION, value: 360 },
    ]},
    { elementId: 'cosmic-orb-group', property: 'scale', keyframes: [
        { time: 0, value: 1, easing: 'easeInOutSine' }, { time: 2.5, value: 1.05, easing: 'easeInOutSine' },
        { time: 5, value: 1, easing: 'easeInOutSine' }, { time: 7.5, value: 1.05, easing: 'easeInOutSine' },
        { time: 10, value: 1, easing: 'easeInOutSine' }, { time: 12.5, value: 1.05, easing: 'easeInOutSine' },
        { time: 15, value: 1, easing: 'easeInOutSine' }, { time: 17.5, value: 1.05, easing: 'easeInOutSine' }, { time: ANIMATION_DURATION, value: 1 },
    ]},
    // Orb Core
    { elementId: 'orb-core', property: 'fill', keyframes: [
        { time: 0, value: '#FFFF00', easing: 'linear' }, { time: 1, value: '#FFA500', easing: 'linear' }, { time: 2, value: '#FF0000', easing: 'linear' },
        { time: 3, value: '#FFA500', easing: 'linear' }, { time: 4, value: '#FFFF00', easing: 'linear' }, // Loop 4s
        { time: 4, value: '#FFFF00', easing: 'linear' }, { time: 5, value: '#FFA500', easing: 'linear' }, { time: 6, value: '#FF0000', easing: 'linear' },
        { time: 7, value: '#FFA500', easing: 'linear' }, { time: 8, value: '#FFFF00', easing: 'linear' },
        { time: 8, value: '#FFFF00', easing: 'linear' }, { time: 9, value: '#FFA500', easing: 'linear' }, { time: 10, value: '#FF0000', easing: 'linear' },
        { time: 11, value: '#FFA500', easing: 'linear' }, { time: 12, value: '#FFFF00', easing: 'linear' },
        { time: 12, value: '#FFFF00', easing: 'linear' }, { time: 13, value: '#FFA500', easing: 'linear' }, { time: 14, value: '#FF0000', easing: 'linear' },
        { time: 15, value: '#FFA500', easing: 'linear' }, { time: 16, value: '#FFFF00', easing: 'linear' },
        { time: 16, value: '#FFFF00', easing: 'linear' }, { time: 17, value: '#FFA500', easing: 'linear' }, { time: 18, value: '#FF0000', easing: 'linear' },
        { time: 19, value: '#FFA500', easing: 'linear' }, { time: ANIMATION_DURATION, value: '#FFFF00' },
    ]},
    { elementId: 'orb-core', property: 'scale', keyframes: [
        { time: 0, value: 1, easing: 'easeInOutCubic' }, { time: 1, value: 1.2, easing: 'easeInOutCubic' }, { time: 2, value: 0.8, easing: 'easeInOutCubic' },
        { time: 3, value: 1.2, easing: 'easeInOutCubic' }, { time: 4, value: 1, easing: 'easeInOutCubic' }, // Loop 4s, repeat this pattern
        { time: 4, value: 1, easing: 'easeInOutCubic' }, { time: 5, value: 1.2, easing: 'easeInOutCubic' }, { time: 6, value: 0.8, easing: 'easeInOutCubic' },
        { time: 7, value: 1.2, easing: 'easeInOutCubic' }, { time: 8, value: 1, easing: 'easeInOutCubic' },
        { time: 8, value: 1, easing: 'easeInOutCubic' }, { time: 9, value: 1.2, easing: 'easeInOutCubic' }, { time: 10, value: 0.8, easing: 'easeInOutCubic' },
        { time: 11, value: 1.2, easing: 'easeInOutCubic' }, { time: 12, value: 1, easing: 'easeInOutCubic' },
        { time: 12, value: 1, easing: 'easeInOutCubic' }, { time: 13, value: 1.2, easing: 'easeInOutCubic' }, { time: 14, value: 0.8, easing: 'easeInOutCubic' },
        { time: 15, value: 1.2, easing: 'easeInOutCubic' }, { time: 16, value: 1, easing: 'easeInOutCubic' },
        { time: 16, value: 1, easing: 'easeInOutCubic' }, { time: 17, value: 1.2, easing: 'easeInOutCubic' }, { time: 18, value: 0.8, easing: 'easeInOutCubic' },
        { time: 19, value: 1.2, easing: 'easeInOutCubic' }, { time: ANIMATION_DURATION, value: 1 },
    ]},
    { elementId: 'orb-core', property: 'opacity', keyframes: [
        { time: 0, value: 0.8, easing: 'easeInOutSine' }, { time: 1, value: 1, easing: 'easeInOutSine' }, { time: 2, value: 0.7, easing: 'easeInOutSine' },
        { time: 3, value: 1, easing: 'easeInOutSine' }, { time: 4, value: 0.8, easing: 'easeInOutSine' }, // Loop 4s, repeat
         { time: 4, value: 0.8, easing: 'easeInOutSine' }, { time: 5, value: 1, easing: 'easeInOutSine' }, { time: 6, value: 0.7, easing: 'easeInOutSine' },
        { time: 7, value: 1, easing: 'easeInOutSine' }, { time: 8, value: 0.8, easing: 'easeInOutSine' },
        { time: 8, value: 0.8, easing: 'easeInOutSine' }, { time: 9, value: 1, easing: 'easeInOutSine' }, { time: 10, value: 0.7, easing: 'easeInOutSine' },
        { time: 11, value: 1, easing: 'easeInOutSine' }, { time: 12, value: 0.8, easing: 'easeInOutSine' },
        { time: 12, value: 0.8, easing: 'easeInOutSine' }, { time: 13, value: 1, easing: 'easeInOutSine' }, { time: 14, value: 0.7, easing: 'easeInOutSine' },
        { time: 15, value: 1, easing: 'easeInOutSine' }, { time: 16, value: 0.8, easing: 'easeInOutSine' },
        { time: 16, value: 0.8, easing: 'easeInOutSine' }, { time: 17, value: 1, easing: 'easeInOutSine' }, { time: 18, value: 0.7, easing: 'easeInOutSine' },
        { time: 19, value: 1, easing: 'easeInOutSine' }, { time: ANIMATION_DURATION, value: 0.8 },
    ]},
    // Orb Rings
    { elementId: 'orb-ring1', property: 'rotation', keyframes: [ { time: 0, value: 0 }, { time: ANIMATION_DURATION, value: -720 } ]}, // Fast CCW
    { elementId: 'orb-ring1', property: 'strokeWidth', keyframes: [ { time: 0, value: 1 }, { time: 2.5, value: 3 }, { time: 5, value: 1 }, { time: 7.5, value: 3 }, { time: 10, value: 1 }, { time: 12.5, value: 3 }, { time: 15, value: 1 }, { time: 17.5, value: 3 }, {time: ANIMATION_DURATION, value: 1}]},
    { elementId: 'orb-ring1', property: 'drawStartPercent', keyframes: [ { time: 0, value: 0 }, { time: 5, value: 0.5 }, { time: 10, value: 0 }, { time: 15, value: 0.5 }, { time: ANIMATION_DURATION, value: 0 } ]},
    { elementId: 'orb-ring1', property: 'drawEndPercent', keyframes: [ { time: 0, value: 0 }, { time: 5, value: 1 }, {time: 10, value: 0}, {time: 15, value: 1}, {time: ANIMATION_DURATION, value: 0} ]},

    { elementId: 'orb-ring2', property: 'rotation', keyframes: [ { time: 0, value: 0 }, { time: ANIMATION_DURATION, value: 540 } ]}, // Medium CW
    { elementId: 'orb-ring2', property: 'strokeWidth', keyframes: [ { time: 0, value: 0.5 }, { time: 1.5, value: 2 }, { time: 3, value: 0.5 }, { time: 4.5, value: 2 }, { time: 6, value: 0.5 }, { time: 7.5, value: 2 }, { time: 9, value: 0.5 }, { time: 10.5, value: 2 }, { time: 12, value: 0.5 }, { time: 13.5, value: 2 }, { time: 15, value: 0.5 }, { time: 16.5, value: 2 }, { time: 18, value: 0.5 }, { time: 19.5, value: 2 }, { time: ANIMATION_DURATION, value: 0.5 }]},
    { elementId: 'orb-ring2', property: 'drawStartPercent', keyframes: [ { time: 0, value: 1 }, { time: 5, value: 0 }, { time: 10, value: 1 }, { time: 15, value: 0 }, { time: ANIMATION_DURATION, value: 1 }]},
    { elementId: 'orb-ring2', property: 'drawEndPercent', keyframes: [ { time: 0, value: 1 }, { time: 5, value: 0.5 }, { time: 10, value: 1 }, { time: 15, value: 0.5 }, { time: ANIMATION_DURATION, value: 1 }]},

    { elementId: 'orb-ring3', property: 'rotation', keyframes: [ { time: 0, value: 0 }, { time: ANIMATION_DURATION, value: -360 } ]}, // Slow CCW
    { elementId: 'orb-ring3', property: 'strokeWidth', keyframes: [ { time: 0, value: 2 }, { time: 2, value: 0.5 }, { time: 4, value: 2 }, { time: 6, value: 0.5 }, { time: 8, value: 2 }, { time: 10, value: 0.5 }, { time: 12, value: 2 }, { time: 14, value: 0.5 }, { time: 16, value: 2 }, { time: 18, value: 0.5 }, { time: ANIMATION_DURATION, value: 2 }]},
    { elementId: 'orb-ring3', property: 'drawStartPercent', keyframes: [ { time: 0, value: 0.25 }, { time: 3, value: 0.75 }, { time: 6, value: 0.25 }, { time: 9, value: 0.75 }, { time: 12, value: 0.25 }, { time: 15, value: 0.75 }, { time: 18, value: 0.25 }, { time: ANIMATION_DURATION, value: 0.5 } ]},
    { elementId: 'orb-ring3', property: 'drawEndPercent', keyframes: [ { time: 0, value: 0.75 }, { time: 3, value: 0.25 }, { time: 6, value: 0.75 }, { time: 9, value: 0.25 }, { time: 12, value: 0.75 }, { time: 15, value: 0.25 }, { time: 18, value: 0.75 }, { time: ANIMATION_DURATION, value: 0.5 }]},

    // Star 1
    { elementId: 'star1', property: 'motionPath', keyframes: [{ time: 0, value: 'star-motion-path1' }]}, // Assume path lasts for 7s
    { elementId: 'star1', property: 'opacity', keyframes: [ { time: 0, value: 0 }, { time: 0.5, value: 1 }, { time: 6.5, value: 1 }, { time: 7, value: 0 }, { time: ANIMATION_DURATION, value: 0 } ]},
    { elementId: 'star1', property: 'scale', keyframes: [ { time: 0, value: 0.2 }, { time: 0.5, value: 0.2 }, { time: 3.5, value: 1 }, { time: 6.5, value: 0.2 }, { time: 7, value: 0.2 }, {time: ANIMATION_DURATION, value: 0.2} ]},

    // Star 2
    { elementId: 'star2', property: 'motionPath', keyframes: [{ time: 0, value: 'star-motion-path2' }]}, // Assume path available from 0, but animation starts at 2s, lasts 7.5s
    { elementId: 'star2', property: 'opacity', keyframes: [ { time: 0, value: 0}, { time: 2, value: 0 }, { time: 2.5, value: 1 }, { time: 9.5, value: 1 }, { time: 10, value: 0 }, {time: ANIMATION_DURATION, value: 0} ]},
    { elementId: 'star2', property: 'scale', keyframes: [ { time: 0, value: 0.1 }, { time: 2, value: 0.1 }, { time: 2.5, value: 0.1 }, { time: 6, value: 0.8 }, { time: 9.5, value: 0.1 }, { time: 10, value: 0.1 }, {time: ANIMATION_DURATION, value: 0.1} ]},

    // Geometric Dance Group
    { elementId: 'geometric-dance-group', property: 'x', keyframes: [ { time: 0, value: 150 }, { time: 10, value: 200 }, { time: ANIMATION_DURATION, value: 150 } ]},
    { elementId: 'geometric-dance-group', property: 'rotation', keyframes: [ { time: 0, value: 0 }, { time: ANIMATION_DURATION, value: 45 } ]},
    // Morph Shape
    { elementId: 'morph-shape', property: 'fill', keyframes: [ { time: 0, value: '#800080' }, { time: 10, value: '#008000' }, { time: ANIMATION_DURATION, value: '#800080' } ]}, // Purple to Green
    { elementId: 'morph-shape', property: 'd', keyframes: [
        { time: 0, value: star4Points, easing: 'easeInOutCubic' },
        { time: 6.66, value: square4PointsSmooth, easing: 'easeInOutCubic' },
        { time: 13.33, value: diamond4Points, easing: 'easeInOutCubic' },
        { time: ANIMATION_DURATION, value: star4Points },
    ]},
    { elementId: 'morph-shape', property: 'rotation', keyframes: [ { time: 0, value: 0 }, { time: ANIMATION_DURATION, value: -180 } ]},
    // Satellite Rect
    { elementId: 'geo-rect', property: 'x', keyframes: [
        { time: 0, value: -70, easing: 'easeInOutSine' }, { time: 5, value: 0, easing: 'easeInOutSine' }, { time: 10, value: 70, easing: 'easeInOutSine' },
        { time: 15, value: 0, easing: 'easeInOutSine' }, { time: ANIMATION_DURATION, value: -70 }
    ]},
    { elementId: 'geo-rect', property: 'y', keyframes: [
        { time: 0, value: 0, easing: 'easeInOutSine' }, { time: 2.5, value: -50, easing: 'easeInOutSine' }, { time: 5, value: 0, easing: 'easeInOutSine' },
        { time: 7.5, value: 50, easing: 'easeInOutSine' }, { time: 10, value: 0, easing: 'easeInOutSine' },
        { time: 12.5, value: -50, easing: 'easeInOutSine' }, { time: 15, value: 0, easing: 'easeInOutSine' },
        { time: 17.5, value: 50, easing: 'easeInOutSine' }, { time: ANIMATION_DURATION, value: 0 }
    ]},
    { elementId: 'geo-rect', property: 'scale', keyframes: [ { time: 0, value: 1 }, { time: 1.5, value: 1.3 }, { time: 3, value: 1 }, { time: 4.5, value: 1.3 }, { time: 6, value: 1 }, { time: 7.5, value: 1.3 }, { time: 9, value: 1 }, { time: 10.5, value: 1.3 }, { time: 12, value: 1 }, { time: 13.5, value: 1.3 }, { time: 15, value: 1 }, { time: 16.5, value: 1.3 }, { time: 18, value: 1 }, { time: 19.5, value: 1.3 }, {time: ANIMATION_DURATION, value: 1} ]},
    // Satellite Circle
    { elementId: 'geo-circle', property: 'x', keyframes: [
        { time: 0, value: 70, easing: 'easeInOutSine' }, { time: 5, value: -70, easing: 'easeInOutSine' }, { time: 10, value: 70, easing: 'easeInOutSine' },
        { time: 15, value: 0, easing: 'easeInOutSine' }, { time: ANIMATION_DURATION, value: 70 }
    ]},
    { elementId: 'geo-circle', property: 'y', keyframes: [
        { time: 0, value: 0, easing: 'easeInOutSine' }, { time: 2.5, value: 60, easing: 'easeInOutSine' }, { time: 5, value: 0, easing: 'easeInOutSine' },
        { time: 7.5, value: -60, easing: 'easeInOutSine' }, { time: 10, value: 0, easing: 'easeInOutSine' },
        { time: 12.5, value: 60, easing: 'easeInOutSine' }, { time: 15, value: 0, easing: 'easeInOutSine' },
        { time: 17.5, value: -60, easing: 'easeInOutSine' }, { time: ANIMATION_DURATION, value: 0 }
    ]},
    { elementId: 'geo-circle', property: 'fill', keyframes: [ { time: 0, value: '#008000' }, { time: 6.66, value: '#20B2AA' }, { time: 13.33, value: '#0000FF' }, { time: ANIMATION_DURATION, value: '#008000' } ]}, // Green -> LightSeaGreen -> Blue

    // Title Text
    { elementId: 'title-text', property: 'fill', keyframes: [
        { time: 0, value: '#FFD700' }, { time: 5, value: '#FFA500' }, { time: 10, value: '#FF8C00' },
        { time: 15, value: '#FFA500' }, { time: ANIMATION_DURATION, value: '#FFD700' }
    ]},
    { elementId: 'title-text', property: 'strokeWidth', keyframes: [ { time: 0, value: 1 }, { time: 2.5, value: 2.5 }, { time: 5, value: 1 }, {time: 7.5, value: 2.5}, {time: 10, value: 1}, {time: 12.5, value: 2.5}, {time: 15, value: 1}, {time: 17.5, value: 2.5}, {time: ANIMATION_DURATION, value: 1} ]},
    { elementId: 'title-text', property: 'y', keyframes: [
        { time: 0, value: 100, easing: 'easeOutBounce' }, { time: 4, value: 105, easing: 'easeInBounce' }, { time: 8, value: 100, easing: 'easeOutBounce' },
        { time: 12, value: 105, easing: 'easeInBounce'}, {time: 16, value: 100, easing: 'easeOutBounce'}, {time: ANIMATION_DURATION, value: 102}
    ]},
    { elementId: 'title-text', property: 'scale', keyframes: [ { time: 0, value: 1 }, { time: 10, value: 1.02 }, { time: ANIMATION_DURATION, value: 1 } ]},
  ],
};


export const TIMELINE_HEIGHT = 180;
export const TIMELINE_RULER_HEIGHT = 30;
export const TIMELINE_GROUP_ROW_HEIGHT = 30;
export const TIMELINE_PROPERTY_ROW_HEIGHT = 26;
export const TIMELINE_SECONDS_PER_MARKER = 1;
export const TIMELINE_PIXELS_PER_SECOND = 100;
export const TIMELINE_CONTEXT_MENU_WIDTH = 280;
export const ANIMATION_BAR_HEIGHT = 22; // Increased from 10 to 22 for dopesheet bars

export const FRAME_STEP_TIME = 1 / 30; // Assuming 30fps for frame steps
export const DEFAULT_KEYFRAME_EASING = 'linear';
export const BEZIER_CLOSING_THRESHOLD = 10; 

// Bezier drawing visual constants
export const BEZIER_ANCHOR_RADIUS = 7; // Increased from 5
export const BEZIER_HANDLE_RADIUS = 6; // Increased from 4
export const BEZIER_LINE_STROKE_WIDTH = 1.2; 
export const BEZIER_POINT_FILL_COLOR = 'rgba(59, 130, 246, 0.9)'; 
export const BEZIER_POINT_STROKE_COLOR = 'rgba(255, 255, 255, 0.9)';
export const BEZIER_HANDLE_FILL_COLOR = 'rgba(236, 72, 153, 0.9)'; 
export const BEZIER_HANDLE_STROKE_COLOR = 'rgba(255, 255, 255, 0.9)';
export const BEZIER_HANDLE_LINE_COLOR = 'rgba(251, 146, 60, 0.7)'; 
export const BEZIER_SELECTED_POINT_COLOR = 'rgba(250, 204, 21, 0.9)'; 
export const BEZIER_CLOSING_INDICATOR_FILL = 'rgba(74, 222, 128, 0.4)'; 
export const BEZIER_CLOSING_INDICATOR_STROKE = 'rgba(34, 197, 94, 0.9)'; 
export const BEZIER_CLOSING_INDICATOR_RADIUS = 7;
export const MOTION_PATH_HELPER_STROKE_WIDTH = 20; 
export const PATH_HITBOX_EXTRA_WIDTH = 20; // Increased from 10
export const MIN_CLIP_DURATION_SECONDS = 0.01; // Minimum duration for a resizable clip


// Selection Highlight Constants
export const SELECTED_ELEMENT_BOUNDING_BOX_COLOR = 'rgba(250, 204, 21, 0.9)'; 
export const SELECTED_ELEMENT_BOUNDING_BOX_STROKE_WIDTH = 1.5;
export const SELECTED_ELEMENT_BOUNDING_BOX_DASHARRAY = '4,2';
export const SELECTED_ELEMENT_ORIGIN_MARKER_COLOR = 'rgba(255, 100, 0, 0.9)'; 
export const SELECTED_ELEMENT_ORIGIN_MARKER_SIZE = 6;


// Canvas Transformation Handles
export const TRANSFORM_HANDLE_SIZE = 8; 
export const TRANSFORM_HANDLE_COLOR = 'rgba(59, 130, 246, 0.9)'; 
export const TRANSFORM_HANDLE_STROKE_COLOR = 'rgba(255, 255, 255, 0.9)';
export const TRANSFORM_ROTATION_HANDLE_OFFSET = 20; 
export const TRANSFORM_ROTATION_LINE_COLOR = 'rgba(59, 130, 246, 0.7)';


// For ColorPickerInput gradient stop editor
export const STOP_MARKER_SIZE = 14;
export const PANEL_OFFSET = 10;


// Ghost Path Constants
export const GHOST_PATH_COLOR = 'rgba(136, 136, 136, 0.7)'; // #888888 with opacity
export const GHOST_PATH_OPACITY = 0.7;
export const GHOST_PATH_STROKE_DASHARRAY = '4,4';
export const GHOST_PATH_STROKE_WIDTH_FACTOR = 0.8; // Multiplier for default stroke width for ghost paths


export interface SliderConfig {
  min: number;
  max: number;
  step: number;
}

export const SLIDER_CONFIGS: Partial<Record<AnimatableProperty | 'width' | 'height' | 'motionPathOffsetX' | 'motionPathOffsetY' | 'cx' | 'cy' | 'r_radial' | 'fx' | 'fy' | 'fr_radial' | 'fontSize' | 'letterSpacing' | 'lineHeight', SliderConfig>> = {
  x: { min: -200, max: 1000, step: 1 },
  y: { min: -200, max: 800, step: 1 },
  width: { min: 1, max: 800, step: 1 },
  height: { min: 1, max: 600, step: 1 },
  rx: { min: 1, max: 400, step: 1 }, 
  ry: { min: 1, max: 300, step: 1 }, 
  fontSize: { min: 1, max: 200, step: 1 },
  letterSpacing: { min: -10, max: 50, step: 0.1 },
  lineHeight: { min: 0.5, max: 3, step: 0.05 },
  opacity: { min: 0, max: 1, step: 0.01 },
  rotation: { min: -720, max: 720, step: 1 },
  scale: { min: 0.01, max: 5, step: 0.01 },
  skewX: { min: -45, max: 45, step: 1 }, // Added
  skewY: { min: -45, max: 45, step: 1 }, // Added
  strokeWidth: { min: 0, max: 30, step: 0.1 },
  motionPathOffsetX: { min: -200, max: 200, step: 1 },
  motionPathOffsetY: { min: -200, max: 200, step: 1 },
  strokeDashoffset: { min: -1000, max: 1000, step: 1 }, // General default, can be overridden by dynamic config
  drawStartPercent: { min: 0, max: 1, step: 0.01 },
  drawEndPercent: { min: 0, max: 1, step: 0.01 },
  // For Radial Gradient Editor (as percentages)
  cx: { min: -100, max: 200, step: 1 }, // %
  cy: { min: -100, max: 200, step: 1 }, // %
  r_radial: { min: 0, max: 200, step: 1 }, // %
  fx: { min: -100, max: 200, step: 1 }, // %
  fy: { min: -100, max: 200, step: 1 }, // %
  fr_radial: { min: 0, max: 200, step: 1 }, // %
};

export const MOTION_PATH_SEGMENT_CONFIG: SliderConfig = {
  min: 0,
  max: 1,
  step: 0.01,
};

export const GRADIENT_ANGLE_CONFIG: SliderConfig = {
  min: 0,
  max: 360,
  step: 1,
};

export const GRADIENT_STOP_OFFSET_CONFIG: SliderConfig = {
  min: 0,
  max: 100, 
  step: 1,
};

export const MAX_HISTORY_ENTRIES = 50;
export const PASTE_OFFSET = 10;

// Playback Speed Constants
export const DEFAULT_PLAYBACK_SPEED = 1.0;
export const PLAYBACK_SPEED_PRESETS = [
  { value: 0.25, label: "0.25x" },
  { value: 0.5, label: "0.5x" },
  { value: 1.0, label: "1x" },
  { value: 1.5, label: "1.5x" },
  { value: 2.0, label: "2x" },
  { value: 5.0, label: "5x" },
  { value: 10.0, label: "10x" },
];
export const PLAYBACK_SPEED_MIN = 0.1;
export const PLAYBACK_SPEED_MAX = 1000.0; // Increased max speed
export const PLAYBACK_SPEED_CLICK_STEP = 0.25;
export const PLAYBACK_SPEED_DRAG_SENSITIVITY_PER_PIXEL = 0.01; // Speed change per pixel dragged
