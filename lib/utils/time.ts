/**
 * Returns a human-readable relative time string.
 * - "just now" (< 60s)
 * - "Nm ago" (< 60m)
 * - "Nh ago" (< 24h)
 * - "Nd ago" (< 30d)
 * - absolute date string (>= 30d)
 */
export function relativeTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = Date.now();
  const diffMs = now - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;

  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
