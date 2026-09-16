-- Runs once when the Postgres container is first created (docker-entrypoint-initdb.d).
-- Three tables, one per Day 6 concern: two aggregates + the Outbox (R8).
-- Column names mirror the in-memory adapters in solutions/<lang>/src/adapters/persistence.

CREATE TABLE IF NOT EXISTS charging_sessions (
  session_id      TEXT PRIMARY KEY,               -- S-991
  connector_id    TEXT NOT NULL,                  -- CP-A12-2
  id_tag          TEXT NOT NULL,                  -- TAG-MONTHLY-77
  status          TEXT NOT NULL,                  -- Idle | Charging | Completed | Faulted
  meter_start_wh  INTEGER NOT NULL,
  last_meter_wh   INTEGER NOT NULL,
  started_at      TIMESTAMPTZ NOT NULL,
  ended_at        TIMESTAMPTZ,
  stop_reason     TEXT
);

-- Invariant of the Charging context: one active session per connector.
CREATE UNIQUE INDEX IF NOT EXISTS charging_sessions_one_active_per_connector
  ON charging_sessions (connector_id)
  WHERE status = 'Charging';

CREATE TABLE IF NOT EXISTS work_orders (
  work_order_id     TEXT PRIMARY KEY,             -- WO-2208
  charger_id        TEXT NOT NULL,                -- CP-A12
  connector_id      TEXT,                         -- CP-A12-2 (nullable: whole-charger faults)
  fault_code        TEXT NOT NULL,                -- GroundFailure
  status            TEXT NOT NULL,                -- Open | Assigned | Closed
  technician_id     TEXT,                         -- TECH-HAO
  duplicate_reports INTEGER NOT NULL DEFAULT 0,   -- R5: second report is appended, not a new WO
  opened_at         TIMESTAMPTZ NOT NULL,
  closed_at         TIMESTAMPTZ,
  outcome           TEXT
);

-- Invariant of the AssetOps context (R5): one open root-cause WO per charger + fault code.
CREATE UNIQUE INDEX IF NOT EXISTS work_orders_one_open_per_fault
  ON work_orders (charger_id, fault_code)
  WHERE status <> 'Closed';

-- Outbox (R8): the aggregate row and its integration events are written in the SAME
-- transaction; a relay process publishes rows where published_at IS NULL.
CREATE TABLE IF NOT EXISTS outbox (
  id            UUID PRIMARY KEY,                 -- = envelope.eventId
  type          TEXT NOT NULL,                    -- charging.session.started.v1 ...
  payload       JSONB NOT NULL,                   -- the full envelope (eventId, type, version, ... payload)
  occurred_at   TIMESTAMPTZ NOT NULL,
  published_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS outbox_unpublished ON outbox (occurred_at) WHERE published_at IS NULL;

-- Consumer-side idempotency on eventId (the broker delivers at least once). Business dedup (R5:
-- chargerId + faultCode while open) is a different thing and lives in the aggregate/repository.
-- A consumer inserts here in the SAME transaction as its own writes; a conflict means "already done".
CREATE TABLE IF NOT EXISTS processed_events (
  consumer      TEXT NOT NULL,                    -- 'assetops.fault_process_manager' | 'billing.draft'
  event_id      UUID NOT NULL,
  processed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (consumer, event_id)
);
