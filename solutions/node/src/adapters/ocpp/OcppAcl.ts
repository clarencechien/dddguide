import type { ChargingService } from '../../charging/application/ChargingService.ts';
import type { AuthorizationService } from '../../charging/application/ports.ts';
import { connectorIdOf } from '../../charging/domain/Connector.ts';

// OCPP 1.6J call frame: [2, uniqueId, action, payload]; result: [3, uniqueId, payload].
export type OcppCall = [2, string, string, Record<string, any>];
export type OcppResult = [3, string, Record<string, unknown>];

// Anti-corruption layer. OCPP vocabulary (StatusNotification, transactionId, meterStart, sampledValue)
// stops here; only ubiquitous-language commands go inward. One ACL instance per charger connection.
export class OcppAcl {
  private readonly chargerId: string;
  private readonly charging: ChargingService;
  private readonly authorization: AuthorizationService;
  private nextTransactionId: number;

  constructor(
    chargerId: string,
    charging: ChargingService,
    authorization: AuthorizationService,
    options: { firstTransactionId?: number } = {},
  ) {
    this.chargerId = chargerId;
    this.charging = charging;
    this.authorization = authorization;
    this.nextTransactionId = options.firstTransactionId ?? 991; // -> S-991 for the canonical afternoon
  }

  async handle(frame: OcppCall): Promise<OcppResult> {
    const [, uniqueId, action, payload] = frame;
    const result = await this.dispatch(action, payload);
    return [3, uniqueId, result];
  }

  private async dispatch(action: string, p: Record<string, any>): Promise<Record<string, unknown>> {
    switch (action) {
      case 'BootNotification':
        return { status: 'Accepted', currentTime: new Date().toISOString(), interval: 300 };

      case 'Heartbeat':
        return { currentTime: new Date().toISOString() };

      case 'Authorize':
        return { idTagInfo: { status: (await this.authorization.isAuthorized(p.idTag)) ? 'Accepted' : 'Invalid' } };

      case 'StatusNotification': {
        if (p.status !== 'Faulted') return {}; // Available/Preparing/... carry no command in MVP1
        await this.charging.reportFault({
          chargerId: this.chargerId,
          connectorId: p.connectorId > 0 ? connectorIdOf(this.chargerId, p.connectorId) : undefined,
          faultCode: p.errorCode,
          at: p.timestamp,
        });
        return {};
      }

      case 'StartTransaction': {
        const transactionId = this.nextTransactionId++;
        const events = await this.charging.startCharging({
          sessionId: sessionIdFor(transactionId),
          connectorId: connectorIdOf(this.chargerId, p.connectorId),
          idTag: p.idTag,
          meterStartWh: p.meterStart,
          at: p.timestamp,
        });
        const rejected = events.find((e) => e.type === 'ChargingStartRejected');
        return {
          transactionId,
          idTagInfo: { status: rejected ? (rejected.reason === 'Unauthorized' ? 'Invalid' : 'Blocked') : 'Accepted' },
        };
      }

      case 'MeterValues': {
        const meterWh = energyRegisterWh(p.meterValue);
        if (meterWh === undefined || p.transactionId === undefined) return {};
        await this.charging.reportMeterValue({
          sessionId: sessionIdFor(p.transactionId),
          meterWh,
          at: p.meterValue[0].timestamp,
        });
        return {};
      }

      case 'StopTransaction': {
        const sessionId = sessionIdFor(p.transactionId);
        // The final register value is just another meter reading (R3), then the stop (R4).
        await this.charging.reportMeterValue({ sessionId, meterWh: p.meterStop, at: p.timestamp });
        await this.charging.stopCharging({ sessionId, stopReason: p.reason ?? 'Local', at: p.timestamp });
        return { idTagInfo: { status: 'Accepted' } };
      }

      default:
        throw new Error(`OCPP action not supported: ${action}`);
    }
  }
}

function sessionIdFor(transactionId: number): string {
  return `S-${transactionId}`;
}

// MeterValues carries a list of samples; we only care about the cumulative energy register in Wh.
function energyRegisterWh(meterValue: Array<{ sampledValue: Array<Record<string, string>> }> | undefined): number | undefined {
  for (const entry of meterValue ?? []) {
    for (const sample of entry.sampledValue ?? []) {
      const measurand = sample.measurand ?? 'Energy.Active.Import.Register';
      if (measurand !== 'Energy.Active.Import.Register') continue;
      const value = Number(sample.value);
      return sample.unit === 'kWh' ? Math.round(value * 1000) : Math.round(value);
    }
  }
  return undefined;
}
