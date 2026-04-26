import { RUN_DURATION_S } from '../constants';

export class RunTimer {
  remaining: number;
  private expired = false;

  constructor(private onExpire: () => void) {
    this.remaining = RUN_DURATION_S;
  }

  update(deltaMS: number): void {
    if (this.expired) return;
    this.remaining -= deltaMS / 1000;
    if (this.remaining <= 0) {
      this.remaining = 0;
      this.expired = true;
      this.onExpire();
    }
  }

  get isExpired(): boolean {
    return this.expired;
  }

  format(): string {
    const total = Math.ceil(this.remaining);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
}
