import { performance } from "node:perf_hooks";

export interface TimingMetric {
  name: string;
  durationMs: number;
  description?: string;
}

export class ServerTimer {
  private startTimes = new Map<string, number>();
  private metrics: TimingMetric[] = [];
  private totalStart = performance.now();

  start(name: string): void {
    this.startTimes.set(name, performance.now());
  }

  end(name: string, description?: string): number {
    const startTime = this.startTimes.get(name);
    if (startTime === undefined) return 0;
    const durationMs = Math.round((performance.now() - startTime) * 100) / 100;
    this.startTimes.delete(name);
    this.metrics.push({ name, durationMs, description });
    return durationMs;
  }

  async time<T>(name: string, fn: () => Promise<T>, description?: string): Promise<T> {
    this.start(name);
    try {
      return await fn();
    } finally {
      this.end(name, description);
    }
  }

  toHeader(): string {
    const totalMs = Math.round((performance.now() - this.totalStart) * 100) / 100;
    const parts = this.metrics.map(
      (m) => `${m.name};dur=${m.durationMs}${m.description ? `;desc="${m.description}"` : ""}`
    );
    parts.push(`total;dur=${totalMs}`);
    return parts.join(", ");
  }

  getMetrics(): TimingMetric[] {
    return [...this.metrics];
  }
}
