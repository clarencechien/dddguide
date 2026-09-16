import { randomUUID } from 'node:crypto';

export type IdGenerator = () => string;

export const newId: IdGenerator = () => randomUUID();

// Deterministic ids for tests and the e2e script: sequence('WO-', 2208) -> WO-2208, WO-2209 ...
export function sequence(prefix: string, start: number): IdGenerator {
  let next = start;
  return () => `${prefix}${next++}`;
}
