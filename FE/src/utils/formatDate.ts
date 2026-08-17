export function formatDate(iso: string, timeZone?: string) {
  // Treat the ISO string as a UTC date to avoid off-by-one from local timezone
  const [year, month, day] = iso.split("T")[0].split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: timeZone || "Asia/Ho_Chi_Minh",
  });
}

// include hour and minute
export function formatDateTime(iso: string, timeZone?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timeZone || "Asia/Ho_Chi_Minh",
  });
}