import type { DomainEvent } from '../shared/DomainEvent.ts';

// Parking is NOT in MVP1 scope; this stub exists to keep R6 executable:
// releasing a vehicle must never depend on HQ being reachable.
export interface ParkingManuallyReleased extends DomainEvent {
  type: 'ParkingManuallyReleased';
  parkingSessionId: string;
  plate: string;
  releasedBy: string;
}
export interface VehicleExited extends DomainEvent {
  type: 'VehicleExited';
  parkingSessionId: string;
  plate: string;
  releaseMode: 'Auto' | 'Manual';
}
export type ParkingEvent = ParkingManuallyReleased | VehicleExited;

export class ParkingSession {
  private events: ParkingEvent[] = [];
  private _status: 'Active' | 'Released' = 'Active';

  readonly parkingSessionId: string; // P-441
  readonly plate: string; // ABC-1234
  readonly enteredAt: string;

  constructor(parkingSessionId: string, plate: string, enteredAt: string) {
    this.parkingSessionId = parkingSessionId;
    this.plate = plate;
    this.enteredAt = enteredAt;
  }

  get status(): 'Active' | 'Released' {
    return this._status;
  }

  // R6: the shift lead (阿忠) releases by hand; Billing reconciles later from the events.
  manualRelease(releasedBy: string, at: string): void {
    if (this._status === 'Released') throw new Error('Already released');
    this._status = 'Released';
    this.events.push({ type: 'ParkingManuallyReleased', parkingSessionId: this.parkingSessionId, plate: this.plate, releasedBy, occurredAt: at });
    this.events.push({ type: 'VehicleExited', parkingSessionId: this.parkingSessionId, plate: this.plate, releaseMode: 'Manual', occurredAt: at });
  }

  pullEvents(): ParkingEvent[] {
    const pulled = this.events;
    this.events = [];
    return pulled;
  }
}
