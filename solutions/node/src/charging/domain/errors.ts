// Errors are for programming / protocol mistakes (calling Stop on an Idle session).
// Business "no"s that stakeholders care about are *events* (ChargingStartRejected, MeterValueRejected).
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainError';
  }
}

export class InvalidStateError extends DomainError {
  constructor(action: string, status: string) {
    super(`Cannot ${action}: session is ${status}`);
    this.name = 'InvalidStateError';
  }
}
