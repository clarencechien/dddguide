import { describe, expect, it } from 'vitest';
import { ParkingSession } from '../../src/parking/ParkingSession.ts';

describe('Parking stub', () => {
  it('R6 manual release works without HQ and publishes ParkingManuallyReleased', () => {
    const parking = new ParkingSession('P-441', 'ABC-1234', '2025-05-20T14:02:00+08:00');

    parking.manualRelease('阿忠', '2025-05-20T14:33:00+08:00');

    expect(parking.status).toBe('Released');
    expect(parking.pullEvents()).toEqual([
      { type: 'ParkingManuallyReleased', parkingSessionId: 'P-441', plate: 'ABC-1234', releasedBy: '阿忠', occurredAt: '2025-05-20T14:33:00+08:00' },
      { type: 'VehicleExited', parkingSessionId: 'P-441', plate: 'ABC-1234', releaseMode: 'Manual', occurredAt: '2025-05-20T14:33:00+08:00' },
    ]);
  });
});
