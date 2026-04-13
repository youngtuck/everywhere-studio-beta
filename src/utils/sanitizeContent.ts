/**
 * Strips em-dashes and other AI tells from generated content.
 * This is the last line of defense before content reaches the user.
 */
export function sanitizeContent(text: string): string {
  if (!text) return text;

  // Replace em-dash (U+2014) with comma-space
  let result = text.replace(/\s*\u2014\s*/g, ", ");

  // Replace en-dash used as em-dash (space-endash-space) with comma-space
  result = result.replace(/\s+\u2013\s+/g, ", ");

  // Clean up double commas or comma-period from replacement
  result = result.replace(/, ,/g, ",");
  result = result.replace(/,\./g, ".");
  result = result.replace(/,\s*,/g, ",");

  return result;
}
