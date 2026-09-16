// The domain never calls `new Date()` directly; time is injected so tests can pin "14:04".
export interface Clock {
  now(): string; // ISO-8601
}

export class SystemClock implements Clock {
  now(): string {
    return new Date().toISOString();
  }
}

export class FixedClock implements Clock {
  private current: string;
  constructor(initial: string) {
    this.current = initial;
  }
  now(): string {
    return this.current;
  }
  set(iso: string): void {
    this.current = iso;
  }
}
