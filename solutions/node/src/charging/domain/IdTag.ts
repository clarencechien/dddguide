import { DomainError } from './errors.ts';

// The credential presented to start charging (RFID card, app token). "TAG-MONTHLY-77".
export type IdTag = string;

export function parseIdTag(raw: string): IdTag {
  const value = raw.trim();
  if (value.length === 0 || value.length > 20) throw new DomainError(`Invalid idTag: "${raw}"`);
  return value;
}
