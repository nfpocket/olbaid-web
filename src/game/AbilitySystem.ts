export type AbilityCallback = (worldX?: number, worldY?: number) => void;

export const SLOT_Q   = 0;
export const SLOT_W   = 1;
export const SLOT_E   = 2;
export const SLOT_R   = 3;
export const SLOT_LMB = 4;
export const SLOT_RMB = 5;
export const SLOT_COUNT = 6;

// Base cooldowns in ms: Q, W, E, R, LMB, RMB
// Q = bouncing projectile (primary attack, scaled by attackSpeed stat)
// LMB = nova (ability, scaled by cooldownReduction stat)
const BASE_COOLDOWNS = [1000, 8000, 1000, 12000, 4000, 2000];

export class AbilitySystem {
  private slots: (AbilityCallback | null)[] = new Array(SLOT_COUNT).fill(null);
  private cooldowns: number[] = new Array(SLOT_COUNT).fill(0);
  readonly baseCooldowns: readonly number[] = BASE_COOLDOWNS;
  readonly onFired: ((slot: number) => void)[] = [];

  setAbility(slot: number, fn: AbilityCallback): void {
    this.slots[slot] = fn;
  }

  canFire(slot: number): boolean {
    return this.cooldowns[slot] <= 0;
  }

  getCooldownFraction(slot: number): number {
    if (this.baseCooldowns[slot] <= 0) return 0;
    return Math.max(0, this.cooldowns[slot] / this.baseCooldowns[slot]);
  }

  fire(slot: number, worldX?: number, worldY?: number): void {
    if (!this.canFire(slot)) return;
    const fn = this.slots[slot];
    if (fn) fn(worldX, worldY);
    this.cooldowns[slot] = this.baseCooldowns[slot];
    this.onFired.forEach(cb => cb(slot));
  }

  tick(deltaMS: number, _unused = 0, attackSpeed = 1.0): void {
    const drain = deltaMS * attackSpeed;
    for (let i = 0; i < SLOT_COUNT; i++) {
      if (this.cooldowns[i] > 0) {
        this.cooldowns[i] = Math.max(0, this.cooldowns[i] - drain);
      }
    }
  }
}
