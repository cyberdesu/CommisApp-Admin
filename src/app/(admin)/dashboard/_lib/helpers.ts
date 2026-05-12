export function compactCurrency(value: number, currency = "USD"): string {
  if (!Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: abs >= 1000 ? 1 : 2,
    minimumFractionDigits: 0,
    notation: abs >= 10_000 ? "compact" : "standard",
    compactDisplay: "short",
  });
  return formatter.format(value);
}

export function compactNumber(value: number): string {
  if (!Number.isFinite(value)) return "—";
  if (Math.abs(value) >= 10_000) {
    return new Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  }
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatPct(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return "—";
  return `${value.toFixed(digits)}%`;
}

export function sparklineFromValues(
  values: number[],
  width = 100,
  height = 24,
  pad = 2,
): string {
  if (values.length < 2) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = (width - pad * 2) / (values.length - 1);
  return values
    .map((v, i) => {
      const x = pad + i * stepX;
      const y = pad + ((max - v) / range) * (height - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export function buildSparkSamples(seed: string, count = 8): number[] {
  // Deterministic pseudo-random values for placeholder charts when backend
  // lacks time series. Range 0-100.
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const samples: number[] = [];
  let cur = (h % 50) + 25;
  for (let i = 0; i < count; i++) {
    h = (h * 1103515245 + 12345) >>> 0;
    const jitter = ((h >>> 16) % 30) - 15;
    cur = Math.max(5, Math.min(95, cur + jitter));
    samples.push(cur);
  }
  return samples;
}
