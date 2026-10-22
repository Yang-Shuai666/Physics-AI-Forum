/** 2026-10-21 -> "2026-W43"（ISO 8601 周次，周一为第一天） */
export function isoWeek(dateStr) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return "";
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const year = d.getUTCFullYear();
  const yearStart = Date.UTC(year, 0, 1);
  const week = Math.ceil(((d.getTime() - yearStart) / 86400000 + 1) / 7);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

/** "2026-W43" -> { start: "2026-10-19", end: "2026-10-25" } */
export function weekRange(week) {
  const m = /^(\d{4})-W(\d{2})$/.exec(String(week));
  if (!m) return null;
  const year = Number(m[1]);
  const w = Number(m[2]);
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const offset = (jan4.getUTCDay() || 7) - 1;
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - offset + (w - 1) * 7);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  return { start: monday.toISOString().slice(0, 10), end: sunday.toISOString().slice(0, 10) };
}

export function weekLabel(week) {
  const range = weekRange(week);
  return range ? `${range.start} ~ ${range.end}` : "";
}
