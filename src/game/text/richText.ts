/**
 * Minecraft/Bukkit 风格 & / § 格式化文本。
 * 颜色：&0-&9、&a-&f；样式：&l 粗体、&o 斜体、&n 下划线、&m 删除线、&k 混淆、&r 重置。
 * 十六进制：&#RRGGBB 或 &x&R&R&G&G&B&B（简化为 &#RRGGBB）。
 */

export const RICH_TEXT_MAX_VISIBLE_LENGTH = 24;

const COLOR_CODES: Record<string, string> = {
  "0": "#1e1e1e",
  "1": "#1d4ed8",
  "2": "#15803d",
  "3": "#0891b2",
  "4": "#b91c1c",
  "5": "#7e22ce",
  "6": "#b45309",
  "7": "#9ca3af",
  "8": "#4b5563",
  "9": "#2563eb",
  a: "#16a34a",
  b: "#06b6d4",
  c: "#ef4444",
  d: "#d946ef",
  e: "#eab308",
  f: "#f8fafc"
};

interface RichTextStyle {
  color: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
  obfuscated: boolean;
}

interface RichTextSegment {
  text: string;
  style: RichTextStyle;
}

const DEFAULT_STYLE: RichTextStyle = {
  color: "#3d3125",
  bold: false,
  italic: false,
  underline: false,
  strikethrough: false,
  obfuscated: false
};

export function getRichTextVisibleLength(source: string): number {
  return segmentRichText(source).reduce((sum, segment) => sum + segment.text.length, 0);
}

export function stripRichTextFormatting(source: string): string {
  return segmentRichText(source).map((segment) => segment.text).join("");
}

export function isRichTextWithinVisibleLimit(source: string, max = RICH_TEXT_MAX_VISIBLE_LENGTH): boolean {
  return getRichTextVisibleLength(source) <= max;
}

export function hasRichTextFormatting(source: string): boolean {
  return /[&§][0-9a-fk-or#]/i.test(source);
}

export function renderRichTextToHtml(source: string): string {
  const segments = segmentRichText(source);
  if (segments.length === 0) {
    return "";
  }

  return segments.map((segment) => {
    if (segment.text.length === 0) {
      return "";
    }

    const classes = ["rich-text-segment"];
    const styles: string[] = [`color:${segment.style.color}`];
    if (segment.style.bold) {
      classes.push("rich-text-bold");
    }
    if (segment.style.italic) {
      classes.push("rich-text-italic");
    }
    if (segment.style.underline) {
      classes.push("rich-text-underline");
    }
    if (segment.style.strikethrough) {
      classes.push("rich-text-strikethrough");
    }
    if (segment.style.obfuscated) {
      classes.push("rich-text-obfuscated");
    }

    return `<span class="${classes.join(" ")}" style="${styles.join(";")}">${escapeHtml(segment.text)}</span>`;
  }).join("");
}

export function segmentRichText(source: string): RichTextSegment[] {
  const segments: RichTextSegment[] = [];
  let style = cloneStyle(DEFAULT_STYLE);
  let buffer = "";

  const flush = (): void => {
    if (buffer.length === 0) {
      return;
    }

    segments.push({text: buffer, style: cloneStyle(style)});
    buffer = "";
  };

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (char !== "&" && char !== "§") {
      buffer += char;
      continue;
    }

    if (source[index + 1] === "#" && /^#[0-9a-fA-F]{6}$/.test(source.slice(index + 1, index + 8))) {
      flush();
      style.color = source.slice(index + 1, index + 8).toLowerCase();
      index += 7;
      continue;
    }

    if ((source[index + 1] === "x" || source[index + 1] === "X") && source.length >= index + 14) {
      const hexParts = source.slice(index + 2, index + 14);
      if (/^[0-9a-fA-F]{6}$/.test(hexParts)) {
        flush();
        style.color = `#${hexParts.toLowerCase()}`;
        index += 13;
        continue;
      }
    }

    const code = source[index + 1]?.toLowerCase();
    if (!code) {
      buffer += char;
      continue;
    }

    if (code === "r") {
      flush();
      style = cloneStyle(DEFAULT_STYLE);
      index += 1;
      continue;
    }

    if (COLOR_CODES[code]) {
      flush();
      style.color = COLOR_CODES[code];
      index += 1;
      continue;
    }

    if (code === "l") {
      flush();
      style.bold = true;
      index += 1;
      continue;
    }

    if (code === "o") {
      flush();
      style.italic = true;
      index += 1;
      continue;
    }

    if (code === "n") {
      flush();
      style.underline = true;
      index += 1;
      continue;
    }

    if (code === "m") {
      flush();
      style.strikethrough = true;
      index += 1;
      continue;
    }

    if (code === "k") {
      flush();
      style.obfuscated = true;
      index += 1;
      continue;
    }

    buffer += char;
  }

  flush();
  return segments;
}

function cloneStyle(style: RichTextStyle): RichTextStyle {
  return {...style};
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#039;");
}
