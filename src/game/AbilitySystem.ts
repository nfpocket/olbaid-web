export type AbilityCallback = (worldX?: number, worldY?: number) => void;

export const SLOT_Q   = 0;
export const SLOT_W   = 1;
export const SLOT_E   = 2;
export const SLOT_R   = 3;
export const SLOT_LMB = 4;
export const SLOT_RMB = 5;
export const SLOT_COUNT = 6;

export class AbilitySystem {
  private slots: (AbilityCallback | null)[] = new Array(SLOT_COUNT).fill(null);
  readonly onFired: ((slot: number) => void)[] = [];

  setAbility(slot: number, fn: AbilityCallback): void {
    this.slots[slot] = fn;
  }

  fire(slot: number, worldX?: number, worldY?: number): void {
    const fn = this.slots[slot];
    if (fn) fn(worldX, worldY);
    this.onFired.forEach(cb => cb(slot));
    console.log(`Ability slot ${slot} fired`, worldX !== undefined ? `at (${worldX.toFixed(2)}, ${worldY?.toFixed(2)})` : '');
  }
}
