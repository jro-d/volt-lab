/**
 * Marker for the project JSON embedded in a "Save HTML" export. The app used to be called VoltLab,
 * so exports made by older versions carry the old id. New exports write the new id; opening accepts both.
 */
export const EMBEDDED_PROJECT_ID = 'wirewise-embedded-project';
export const LEGACY_EMBEDDED_PROJECT_ID = 'voltlab-embedded-project';

/** CSS selector matching inline scripts that are not an embedded-project marker. */
export const NOT_EMBEDDED_PROJECT = `:not(#${EMBEDDED_PROJECT_ID}):not(#${LEGACY_EMBEDDED_PROJECT_ID})`;

/** Reads the embedded project JSON (new marker first, then the old one). Returns null if absent or malformed. */
export function readEmbeddedProject(doc: Pick<Document, 'getElementById'>): any | null {
  for (const id of [EMBEDDED_PROJECT_ID, LEGACY_EMBEDDED_PROJECT_ID]) {
    const text = doc.getElementById(id)?.textContent;
    if (!text?.trim()) continue;
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }
  return null;
}
