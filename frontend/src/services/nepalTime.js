/**
 * Nepal Standard Time (NPT) Formatter & Utility
 * Nepal Time Zone: Asia/Kathmandu (UTC +05:45)
 */

export const parseUTCToDate = (dateInput) => {
  if (!dateInput) return null;
  if (dateInput instanceof Date) return dateInput;
  let str = String(dateInput).trim();
  if (!str) return null;

  // If backend returned naive UTC ISO without timezone designator (no 'Z' and no +/- offset)
  if (!str.endsWith("Z") && !/[+-]\d{2}(:\d{2})?$/.test(str)) {
    str += "Z";
  }

  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? null : parsed;
};

export const formatNepaliTime = (dateInput, options = {}) => {
  const d = parseUTCToDate(dateInput);
  if (!d) return "—";

  try {
    return d.toLocaleTimeString("en-US", {
      timeZone: "Asia/Kathmandu",
      hour: "2-digit",
      minute: "2-digit",
      second: options.seconds === false ? undefined : "2-digit",
      hour12: true,
    });
  } catch {
    // Fallback if environment lacks timezone data (add 5h 45m manually)
    const nptMs = d.getTime() + (5 * 60 + 45) * 60 * 1000;
    const nptDate = new Date(nptMs);
    let h = nptDate.getUTCHours();
    const m = String(nptDate.getUTCMinutes()).padStart(2, "0");
    const s = String(nptDate.getUTCSeconds()).padStart(2, "0");
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    const hStr = String(h).padStart(2, "0");
    return `${hStr}:${m}:${s} ${ampm}`;
  }
};

export const formatNepaliDate = (dateInput) => {
  const d = parseUTCToDate(dateInput);
  if (!d) return "—";

  try {
    return d.toLocaleDateString("en-US", {
      timeZone: "Asia/Kathmandu",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    const nptMs = d.getTime() + (5 * 60 + 45) * 60 * 1000;
    const nptDate = new Date(nptMs);
    return nptDate.toISOString().split("T")[0];
  }
};

export const formatNepaliDateTime = (dateInput) => {
  const d = parseUTCToDate(dateInput);
  if (!d) return "—";
  const dateStr = formatNepaliDate(d);
  const timeStr = formatNepaliTime(d);
  return `${dateStr}, ${timeStr} (NPT)`;
};
