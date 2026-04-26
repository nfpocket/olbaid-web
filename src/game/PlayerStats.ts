export class PlayerStats {
  damage = 1.0;
  resistance = 0.0;
  maxHp = 100;
  hp = 100;
  attackSpeed = 1.0;
  critChance = 0.05;
  critDamage = 1.5;
  xp = 0;
  level = 1;
  xpToNext = 50;
  speedBoostTimer = 0; // ms remaining on E-dash speed buff

  onLevelUp?: () => void;
  onDeath?: () => void;

  rollCrit(base: number): { damage: number; isCrit: boolean } {
    const isCrit = Math.random() < this.critChance;
    return { damage: isCrit ? base * this.critDamage : base, isCrit };
  }

  takeDamage(raw: number): void {
    const actual = Math.max(0, raw * (1 - this.resistance));
    this.hp = Math.max(0, this.hp - actual);
    if (this.hp === 0) this.onDeath?.();
  }

  addXp(amount: number): void {
    this.xp += amount;
    while (this.xp >= this.xpToNext) {
      this.xp -= this.xpToNext;
      this.level++;
      this.xpToNext = Math.round(this.xpToNext * 1.4);
      this.onLevelUp?.();
    }
  }

  effectiveSpeed(baseSpeed: number): number {
    return this.speedBoostTimer > 0 ? baseSpeed * 2 : baseSpeed;
  }

  tick(deltaMS: number): void {
    if (this.speedBoostTimer > 0) this.speedBoostTimer -= deltaMS;
  }
}
