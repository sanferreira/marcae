export function toLocalDateString(date = new Date()): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().split("T")[0];
}

export function addLocalDays(days: number, from = new Date()): Date {
  const date = new Date(from);
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date;
}

export function fromLocalDateString(value: string): Date {
  return new Date(`${value}T12:00:00`);
}
