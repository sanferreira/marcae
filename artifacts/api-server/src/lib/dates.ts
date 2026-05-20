const DEFAULT_TIME_ZONE = process.env.APP_TIME_ZONE ?? "America/Sao_Paulo";

export function toBusinessDateString(date = new Date(), timeZone = DEFAULT_TIME_ZONE): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  if (!year || !month || !day) return date.toISOString().split("T")[0];
  return `${year}-${month}-${day}`;
}

export function addBusinessDays(days: number, from = new Date()): string {
  const base = new Date(`${toBusinessDateString(from)}T12:00:00`);
  base.setDate(base.getDate() + days);
  return toBusinessDateString(base);
}
