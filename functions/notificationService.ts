/**
 * NOTIFICATION SERVICE (Backend)
 * 
 * Canonical notification routing and management for TankRadar.
 * All system alerts, moderation events, and price alerts route through this service.
 * 
 * Phase 2.5 Entry 49 — Notification Governance Layer
 * 
 * Functions exposed:
 * - createNotification
 * - markNotificationRead
 * - fetchUserNotifications
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const NOTIFICATION_TYPES = {
  PRICE_ALERT: "price_alert",
  REVIEW_REQUIRED: "review_required",
  SYSTEM_NOTICE: "system_notice",
  DATA_SOURCE_FAILURE: "data_source_failure",
  STATION_REVIEW_ASSIGNMENT: "station_review_assignment"
};

const RELATED_ENTITY_TYPES = {
  FUEL_PRICE: "FuelPrice",
  STATION: "Station",
  STATION_CANDIDATE: "StationCandidate",
  STATION_REVIEW: "StationReview",
  ALERT: "Alert",
  SYSTEM: "System"
};

function isValidNotificationType(type) {
  return Object.values(NOTIFICATION_TYPES).includes(type);
}

function isValidRelatedEntityType(type) {
  return Object.values(RELATED_ENTITY_TYPES).includes(type);
}

async function createNotification(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { userId, type, title, message, relatedEntityType, relatedEntityId } = body;

    // Validate
    if (!userId) return Response.json({ error: 'userId required' }, { status: 400 });
    if (!isValidNotificationType(type)) return Response.json({ error: 'Invalid notification type' }, { status: 400 });
    if (!title || !message) return Response.json({ error: 'title and message required' }, { status: 400 });
    if (!isValidRelatedEntityType(relatedEntityType)) return Response.json({ error: 'Invalid related entity type' }, { status: 400 });
    if (!relatedEntityId) return Response.json({ error: 'relatedEntityId required' }, { status: 400 });

    const notification = await base44.entities.Notification.create({
      userId,
      type,
      title,
      message,
      relatedEntityType,
      relatedEntityId,
      isRead: false
    });

    return Response.json({ success: true, notification });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

async function markNotificationRead(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { notificationId } = body;

    if (!notificationId) return Response.json({ error: 'notificationId required' }, { status: 400 });

    const notification = await base44.entities.Notification.update(notificationId, { isRead: true });

    return Response.json({ success: true, notification });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

async function fetchUserNotifications(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { userId, isRead, type, limit = 50 } = body;

    if (!userId) return Response.json({ error: 'userId required' }, { status: 400 });

    const query = { userId };
    if (isRead !== undefined) query.isRead = isRead;
    if (type) query.type = type;

    const notifications = await base44.entities.Notification.filter(query, "-created_date", limit);

    return Response.json({ success: true, notifications });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// Router for different service endpoints
Deno.serve(async (req) => {
  const url = new URL(req.url);
  const pathname = url.pathname;

  if (pathname.includes('createNotification')) return createNotification(req);
  if (pathname.includes('markNotificationRead')) return markNotificationRead(req);
  if (pathname.includes('fetchUserNotifications')) return fetchUserNotifications(req);

  return Response.json({ error: 'Unknown endpoint' }, { status: 404 });
});