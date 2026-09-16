import type { ChargingService } from '../../charging/application/ChargingService.ts';
import type { AuthorizationService } from '../../charging/application/ports.ts';
import { connectorIdOf } from '../../charging/domain/Connector.ts';

// OCPP 1.6J call frame: [2, uniqueId, action, payload]; result: [3, uniqueId, payload].
export type OcppCall = [2, string, string, Record<string, any>];
export type OcppResult = [3, string, Record<string, unknown>];

// Day 6 B1: anti-corruption layer. OCPP vocabulary stops here; only ubiquitous-language commands go inward.
// One instance per charger connection (the charger id comes from the connection / URL, not the payload).
//
// Translate:
//   StatusNotification(status=Faulted, errorCode)  -> charging.reportFault({ chargerId, connectorId?, faultCode: errorCode, at: timestamp })
//   StartTransaction(connectorId, idTag, meterStart) -> charging.startCharging({ sessionId: `S-${transactionId}`, connectorId: connectorIdOf(chargerId, n), ... })
//   MeterValues(transactionId, meterValue[].sampledValue[]) -> charging.reportMeterValue({ sessionId, meterWh, at })   (Energy.Active.Import.Register, Wh)
//   StopTransaction(transactionId, meterStop, reason) -> reportMeterValue(meterStop) then stopCharging({ stopReason })
// Test idea: after feeding the 4 messages, JSON.stringify(outbox) must not contain any OCPP field name.
export class OcppAcl {
  private readonly chargerId: string;
  private readonly charging: ChargingService;
  private readonly authorization: AuthorizationService;
  private nextTransactionId = 991; // -> S-991 for the canonical afternoon

  constructor(chargerId: string, charging: ChargingService, authorization: AuthorizationService) {
    this.chargerId = chargerId;
    this.charging = charging;
    this.authorization = authorization;
  }

  async handle(frame: OcppCall): Promise<OcppResult> {
    const [, uniqueId, action, payload] = frame;
    switch (action) {
      case 'BootNotification':
        return [3, uniqueId, { status: 'Accepted', currentTime: new Date().toISOString(), interval: 300 }];
      default:
        throw new Error(`TODO Day 6 B1: translate OCPP ${action} for ${this.chargerId}`);
    }
  }
}
