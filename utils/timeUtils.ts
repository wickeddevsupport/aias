
// src/utils/timeUtils.ts

export const DURATION_MIN_SECONDS = 0.01; // Minimum 10ms
export const DURATION_DRAG_SENSITIVITY_MS_PER_PIXEL = 10; // ms change per pixel dragged vertically
export const DURATION_CLICK_STEP_MS = 100; // ms change per click on chevrons

/**
 * Formats total seconds into HH:MM:SS.ms string.
 * @param totalSeconds The total duration in seconds.
 * @returns A string formatted as HH:MM:SS.ms.
 */
export function formatDurationHHMMSSms(totalSeconds: number): string {
  const clampedSeconds = Math.max(DURATION_MIN_SECONDS, totalSeconds);
  
  const hours = Math.floor(clampedSeconds / 3600);
  const minutes = Math.floor((clampedSeconds % 3600) / 60);
  const seconds = Math.floor(clampedSeconds % 60);
  // Ensure milliseconds are always two digits for display, e.g., .05, .10, .95
  const milliseconds = Math.round((clampedSeconds - Math.floor(clampedSeconds)) * 100);

  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  const msDisplay = String(milliseconds).padStart(2, '0');

  return `${hh}:${mm}:${ss}.${msDisplay}`;
}

/**
 * Parses an HH:MM:SS.ss string into total seconds.
 * @param durationString The duration string in HH:MM:SS.ss format.
 * @returns The total duration in seconds, or null if parsing fails.
 */
export function parseDurationHHMMSSms(durationString: string): number | null {
  const parts = durationString.split(/[:.]/);
  if (parts.length < 3 || parts.length > 4) return null; // HH:MM:SS or HH:MM:SS.ms

  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const s = parseInt(parts[2], 10);
  let ms = 0;
  if (parts[3]) {
    // Handle partial ms inputs correctly, e.g., ".1" becomes 100ms, ".12" becomes 120ms
    const msStr = parts[3];
    if (msStr.length === 1) ms = parseInt(msStr, 10) * 10; // "1" -> 10ms, but should be interpreted as .10s -> 100ms.
                                                         // If user types HH:MM:SS.1, it means 100ms.
                                                         // If they type HH:MM:SS.01, it means 10ms.
    else if (msStr.length >= 2) ms = parseInt(msStr.substring(0,2), 10); // Only first two digits for ms. "123" -> 120ms
    if (isNaN(ms)) return null;
  }


  if (isNaN(h) || isNaN(m) || isNaN(s)) return null;
  if (h < 0 || m < 0 || m > 59 || s < 0 || s > 59 || ms < 0 || ms > 99) return null;

  let totalSeconds = h * 3600 + m * 60 + s + ms / 100;
  totalSeconds = Math.max(DURATION_MIN_SECONDS, totalSeconds);
  
  return totalSeconds;
}

/**
 * Adjusts duration by a delta in milliseconds.
 * @param currentSeconds Current duration in seconds.
 * @param deltaMs Change in milliseconds (positive to increase, negative to decrease).
 * @returns New duration in seconds, clamped to minimum.
 */
export function adjustDuration(currentSeconds: number, deltaMs: number): number {
  const newTotalSeconds = currentSeconds + (deltaMs / 1000);
  return Math.max(DURATION_MIN_SECONDS, newTotalSeconds);
}


// --- New Timeline Ruler Utilities ---

export const PREFERRED_RULER_INTERVALS_SECONDS = [
    // Milliseconds as fractions of a second
    0.01, 0.02, 0.05, 0.1, 0.2, 0.25, 0.5,
    // Seconds
    1, 2, 5, 10, 15, 30,
    // Minutes
    60, 2 * 60, 5 * 60, 10 * 60, 15 * 60, 30 * 60,
    // Hours
    60 * 60, 2 * 60 * 60, 6 * 60 * 60, 12 * 60 * 60, 24 * 60 * 60
];

export function getRulerMajorMarkerInterval(effectivePixelsPerSecond: number, totalDurationSeconds: number): number {
    if (totalDurationSeconds <= 0 || effectivePixelsPerSecond <= 0) return 1;

    const idealMarkerPixelWidth = 80; 
    const targetIntervalSeconds = idealMarkerPixelWidth / effectivePixelsPerSecond;

    for (const interval of PREFERRED_RULER_INTERVALS_SECONDS) {
        if (interval >= targetIntervalSeconds) {
            if (totalDurationSeconds / interval >= 1.5 || interval === PREFERRED_RULER_INTERVALS_SECONDS[0]) {
                return interval;
            }
        }
    }
    return PREFERRED_RULER_INTERVALS_SECONDS[PREFERRED_RULER_INTERVALS_SECONDS.length - 1];
}

export function getRulerSubdivisionCount(majorIntervalSeconds: number, effectivePixelsPerSecond: number): number {
    const pixelsPerMajorInterval = majorIntervalSeconds * effectivePixelsPerSecond;
    if (pixelsPerMajorInterval < 15) return 0;

    if (majorIntervalSeconds >= 5) { // 5s, 10s, 1min etc.
        if (pixelsPerMajorInterval > 150) return 10;
        if (pixelsPerMajorInterval > 75) return 5;
        if (pixelsPerMajorInterval > 30) return majorIntervalSeconds % 2 === 0 || majorIntervalSeconds % 5 === 0 ? 4 : 2; // e.g., 4 for 10s, 2 for 5s
    } else if (majorIntervalSeconds >= 1) { // 1s, 2s
        if (pixelsPerMajorInterval > 100) return 10; // 0.1s marks
        if (pixelsPerMajorInterval > 50) return 5;  // 0.2s marks
        if (pixelsPerMajorInterval > 25) return 2;  // 0.5s marks
    } else { // sub-second major intervals
        if (pixelsPerMajorInterval > 80) return 10; // e.g. for 0.5s major -> 0.05s minor
        if (pixelsPerMajorInterval > 40) return 5;
        if (pixelsPerMajorInterval > 20) return 2;
    }
    return majorIntervalSeconds > 0.1 ? 1 : 0; // At least one middle mark if major interval is not too small
}

export function formatTimeForRulerDisplay(timeInSeconds: number, majorMarkerIntervalSeconds: number, totalDurationSeconds: number): string {
  const absTime = Math.abs(timeInSeconds);
  const msRaw = (absTime - Math.floor(absTime)); // Fraction of a second
  
  const totalSec = Math.floor(absTime);
  const sec = totalSec % 60;
  const totalMin = Math.floor(totalSec / 60);
  const min = totalMin % 60;
  const hr = Math.floor(totalMin / 60);

  const sign = timeInSeconds < 0 ? "-" : "";

  // Higher precision for very small intervals
  if (majorMarkerIntervalSeconds < 0.1) { // e.g., 0.05s interval -> show SS.mss
    const msThreeDigits = Math.round(msRaw * 1000);
    return `${sign}${String(sec).padStart(majorMarkerIntervalSeconds < 1 ? 1 : 2, '0')}.${String(msThreeDigits).padStart(3, '0')}s`;
  } else if (majorMarkerIntervalSeconds < 1) { // e.g., 0.5s interval -> show SS.ms
    const msTwoDigits = Math.round(msRaw * 100);
    return `${sign}${String(sec).padStart(majorMarkerIntervalSeconds < 1 ? 1 : 2, '0')}.${String(msTwoDigits).padStart(2, '0')}s`;
  } else if (majorMarkerIntervalSeconds < 60 || totalDurationSeconds < 60 * 2) { // Seconds or MM:SS
    if (hr > 0) return `${sign}${hr}:${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    if (totalMin > 0) return `${sign}${totalMin}:${String(sec).padStart(2, '0')}`;
    return `${sign}${sec}s`;
  } else if (majorMarkerIntervalSeconds < 3600 || totalDurationSeconds < 3600 * 2) { // MM:SS or HH:MM:SS
    if (hr > 0) return `${sign}${hr}:${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    return `${sign}${String(totalMin).padStart(1, '0')}:${String(sec).padStart(2, '0')}`;
  } else { // HH:MM
    return `${sign}${String(hr).padStart(1, '0')}:${String(min).padStart(2, '0')}`;
  }
}
