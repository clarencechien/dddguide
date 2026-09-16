import { newId } from './Ids.ts';

// The envelope every cross-context event travels in (curriculum §1.8).
// `type` already contains the version suffix (".v1"); `version` repeats it as a number.
export interface IntegrationEvent<P = Record<string, unknown>> {
  readonly eventId: string; // uuid, also the Outbox row id
  readonly type: string; // e.g. "charging.session.started.v1"
  readonly version: number; // 1
  readonly occurredAt: string; // when the fact happened (domain time), not when it was published
  readonly producer: string; // bounded context name: "charging" | "assetops" | "parking" | "billing"
  readonly correlationId: string; // same for the whole business flow (one afternoon at CP-A12-2)
  readonly causationId: string; // the message that directly caused this one
  readonly payload: P;
}

export interface EnvelopeInput<P> {
  type: string;
  producer: string;
  occurredAt: string;
  correlationId: string;
  causationId: string;
  payload: P;
  version?: number;
}

export function createIntegrationEvent<P>(input: EnvelopeInput<P>): IntegrationEvent<P> {
  return {
    eventId: newId(),
    type: input.type,
    version: input.version ?? 1,
    occurredAt: input.occurredAt,
    producer: input.producer,
    correlationId: input.correlationId,
    causationId: input.causationId,
    payload: input.payload,
  };
}
