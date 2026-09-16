// A domain event is a fact that happened inside ONE bounded context.
// It is recorded by the aggregate (never sent to a broker from there: R8)
// and pulled out by the application service after the aggregate method succeeds.
export interface DomainEvent {
  readonly type: string;
  readonly occurredAt: string; // ISO-8601, e.g. "2025-05-20T14:04:00+08:00"
}
