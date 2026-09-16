import { DomainError } from './errors.ts';

// Energy is stored in whole watt-hours (integer) to avoid floating point surprises.
// 12.4 kWh == 12400 Wh.
export type WattHours = number;

export function wattHours(value: number): WattHours {
  if (!Number.isInteger(value) || value < 0) throw new DomainError(`Invalid energy: ${value} Wh`);
  return value;
}

export function toKwh(wh: WattHours): number {
  return wh / 1000;
}
