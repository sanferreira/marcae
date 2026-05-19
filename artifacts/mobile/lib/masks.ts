export const onlyDigits = (value: string) => value.replace(/\D/g, "");

export function maskPhone(value: string) {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 2) return digits ? `(${digits}` : "";
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function maskTime(value: string) {
  const digits = onlyDigits(value).slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

export function maskIsoDate(value: string) {
  const digits = onlyDigits(value).slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
}

export function maskInteger(value: string, maxLength = 6) {
  return onlyDigits(value).slice(0, maxLength);
}

export function maskPercent(value: string) {
  const digits = onlyDigits(value).slice(0, 3);
  if (!digits) return "";
  return String(Math.min(100, Number(digits)));
}

export function maskCurrencyInput(value: string) {
  const cleaned = value.replace(/[^\d,.]/g, "");
  const commaIndex = cleaned.lastIndexOf(",");
  const dotIndex = cleaned.lastIndexOf(".");
  const separatorIndex = Math.max(commaIndex, dotIndex);

  if (separatorIndex >= 0) {
    const integer = onlyDigits(cleaned.slice(0, separatorIndex)).replace(/^0+(?=\d)/, "").slice(0, 9);
    const decimal = onlyDigits(cleaned.slice(separatorIndex + 1)).slice(0, 2);
    return `${integer || "0"},${decimal}`;
  }

  return onlyDigits(cleaned).replace(/^0+(?=\d)/, "").slice(0, 9);
}

export function parseCurrencyInput(value: string) {
  const raw = value.trim().replace(/\s/g, "");
  const normalized = raw.includes(",")
    ? raw.replace(/\./g, "").replace(",", ".")
    : raw;
  return Number(normalized);
}

export function formatCurrencyInput(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return "";
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return "";
  return parsed.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function isValidPhone(value: string) {
  const digits = onlyDigits(value);
  return digits.length === 10 || digits.length === 11;
}

export function passwordPolicyError(password: string) {
  if (password.length < 8) return "A senha deve ter pelo menos 8 caracteres.";
  if (!/[A-Za-zÀ-ÿ]/.test(password)) return "A senha deve ter pelo menos uma letra.";
  if (!/\d/.test(password)) return "A senha deve ter pelo menos um numero.";
  return "";
}

export function isValidTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function isValidIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

export function normalizeSlug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}
