/** Mask PAN for display (e.g. ABCDE1234F → XXXXX1234F). */
export function maskPan(value: string): string {
  const cleaned = value.replace(/\s/g, "").toUpperCase();
  if (!cleaned) return "—";
  if (cleaned.length <= 4) return "X".repeat(cleaned.length);
  return `${"X".repeat(cleaned.length - 4)}${cleaned.slice(-4)}`;
}

/** Mask Aadhaar for display (e.g. 123456789012 → XXXX XXXX 9012). */
export function maskAadhar(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "—";
  if (digits.length <= 4) return "XXXX XXXX " + digits;
  return `XXXX XXXX ${digits.slice(-4)}`;
}
