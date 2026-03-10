/**
 * CANONICAL NOTIFICATION TYPES
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * This file defines the canonical notification type system for TankRadar.
 * All notifications in the system must conform to these type definitions.
 * 
 * No new types may be added without explicit governance decision.
 * 
 * Entry 49: Notification Governance Layer Established
 */

// ─ CANONICAL NOTIFICATION TYPES ─────────────────────────────────────────────
export const NOTIFICATION_TYPES = {
  PRICE_ALERT: "price_alert",
  REVIEW_REQUIRED: "review_required",
  SYSTEM_NOTICE: "system_notice",
  DATA_SOURCE_FAILURE: "data_source_failure",
  STATION_REVIEW_ASSIGNMENT: "station_review_assignment",
};

// ─ CANONICAL RELATED ENTITY TYPES ───────────────────────────────────────────
export const RELATED_ENTITY_TYPES = {
  FUEL_PRICE: "FuelPrice",
  STATION: "Station",
  STATION_CANDIDATE: "StationCandidate",
  STATION_REVIEW: "StationReview",
  ALERT: "Alert",
  SYSTEM: "System",
};

// ─ NOTIFICATION TYPE DESCRIPTIONS ───────────────────────────────────────────
export const NOTIFICATION_TYPE_DESCRIPTIONS = {
  price_alert:
    "User price alert triggered (geographic or station-level)",
  review_required:
    "Manual review required for station, candidate, or duplicate",
  system_notice:
    "General system announcement or maintenance notification",
  data_source_failure:
    "External data source failed to fetch or update",
  station_review_assignment:
    "Curator assigned a station review task",
};

// ─ VALIDATION ───────────────────────────────────────────────────────────────
export const isValidNotificationType = (type) =>
  Object.values(NOTIFICATION_TYPES).includes(type);

export const isValidRelatedEntityType = (entityType) =>
  Object.values(RELATED_ENTITY_TYPES).includes(entityType);

/**
 * Validate a notification object structure.
 * Does NOT persist or modify anything.
 * 
 * @param {Object} notification - The notification to validate
 * @returns {Object} { isValid: boolean, errors: string[] }
 */
export const validateNotificationStructure = (notification) => {
  const errors = [];

  if (!notification.userId || typeof notification.userId !== "string") {
    errors.push("userId must be a non-empty string");
  }

  if (!isValidNotificationType(notification.type)) {
    errors.push(
      `type must be one of: ${Object.values(NOTIFICATION_TYPES).join(", ")}`
    );
  }

  if (!notification.title || typeof notification.title !== "string") {
    errors.push("title must be a non-empty string");
  }

  if (!notification.message || typeof notification.message !== "string") {
    errors.push("message must be a non-empty string");
  }

  if (!isValidRelatedEntityType(notification.relatedEntityType)) {
    errors.push(
      `relatedEntityType must be one of: ${Object.values(RELATED_ENTITY_TYPES).join(", ")}`
    );
  }

  if (
    !notification.relatedEntityId ||
    typeof notification.relatedEntityId !== "string"
  ) {
    errors.push("relatedEntityId must be a non-empty string");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};