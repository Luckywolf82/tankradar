/**
 * NOTIFICATION TYPES GOVERNANCE
 * 
 * Canonical notification type definitions for TankRadar.
 * All system alerts, moderation events, and price alerts use these types.
 * 
 * Phase 2.5 Entry 49 — Notification Governance Layer
 */

export const NOTIFICATION_TYPES = {
  PRICE_ALERT: "price_alert",
  REVIEW_REQUIRED: "review_required",
  SYSTEM_NOTICE: "system_notice",
  DATA_SOURCE_FAILURE: "data_source_failure",
  STATION_REVIEW_ASSIGNMENT: "station_review_assignment"
};

export const RELATED_ENTITY_TYPES = {
  FUEL_PRICE: "FuelPrice",
  STATION: "Station",
  STATION_CANDIDATE: "StationCandidate",
  STATION_REVIEW: "StationReview",
  ALERT: "Alert",
  SYSTEM: "System"
};

/**
 * Type validation helpers
 */
export function isValidNotificationType(type) {
  return Object.values(NOTIFICATION_TYPES).includes(type);
}

export function isValidRelatedEntityType(type) {
  return Object.values(RELATED_ENTITY_TYPES).includes(type);
}

/**
 * Canonical descriptions for UI and documentation
 */
export const NOTIFICATION_TYPE_LABELS = {
  [NOTIFICATION_TYPES.PRICE_ALERT]: "Prisvarsel",
  [NOTIFICATION_TYPES.REVIEW_REQUIRED]: "Gjennomgang påkrevd",
  [NOTIFICATION_TYPES.SYSTEM_NOTICE]: "Systemvarsel",
  [NOTIFICATION_TYPES.DATA_SOURCE_FAILURE]: "Datakildestatus",
  [NOTIFICATION_TYPES.STATION_REVIEW_ASSIGNMENT]: "Stasjongjennomgang tilordnet"
};