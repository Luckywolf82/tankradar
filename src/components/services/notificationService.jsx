/**
 * NOTIFICATION SERVICE
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Centralized notification management service for TankRadar.
 * Provides validated helper functions for all notification operations.
 * 
 * Entry 49: Notification Governance Layer
 */

import { base44 } from "@/api/base44Client";
import {
  validateNotificationStructure,
  NOTIFICATION_TYPES,
  RELATED_ENTITY_TYPES,
} from "@/components/governance/NotificationTypes";

/**
 * Create a new notification.
 * Validates structure before persistence.
 * 
 * @param {Object} notificationData - Notification data
 * @param {string} notificationData.userId - User email or ID
 * @param {string} notificationData.type - One of NOTIFICATION_TYPES
 * @param {string} notificationData.title - Notification title
 * @param {string} notificationData.message - Notification message
 * @param {string} notificationData.relatedEntityType - One of RELATED_ENTITY_TYPES
 * @param {string} notificationData.relatedEntityId - ID of related entity
 * @returns {Promise<Object>} The created notification record
 * @throws {Error} If validation fails
 */
export const createNotification = async (notificationData) => {
  const validation = validateNotificationStructure(notificationData);

  if (!validation.isValid) {
    throw new Error(
      `Notification validation failed: ${validation.errors.join("; ")}`
    );
  }

  try {
    const created = await base44.entities.Notification.create({
      ...notificationData,
      isRead: false,
    });
    return created;
  } catch (err) {
    console.error("Failed to create notification:", err);
    throw err;
  }
};

/**
 * Mark a notification as read.
 * 
 * @param {string} notificationId - The notification ID
 * @returns {Promise<Object>} The updated notification record
 */
export const markNotificationAsRead = async (notificationId) => {
  try {
    const updated = await base44.entities.Notification.update(notificationId, {
      isRead: true,
    });
    return updated;
  } catch (err) {
    console.error("Failed to mark notification as read:", err);
    throw err;
  }
};

/**
 * Fetch all notifications for a user.
 * 
 * @param {string} userId - User email or ID
 * @param {Object} options - Query options
 * @param {boolean} options.unreadOnly - If true, only fetch unread notifications
 * @param {number} options.limit - Maximum number of records to fetch
 * @param {string} options.sortBy - Field to sort by (default: "-created_date")
 * @returns {Promise<Array>} Array of notification records
 */
export const fetchUserNotifications = async (userId, options = {}) => {
  const {
    unreadOnly = false,
    limit = 50,
    sortBy = "-created_date",
  } = options;

  try {
    let query = { userId };

    if (unreadOnly) {
      query.isRead = false;
    }

    const notifications = await base44.entities.Notification.filter(
      query,
      sortBy,
      limit
    );
    return notifications || [];
  } catch (err) {
    console.error("Failed to fetch notifications:", err);
    throw err;
  }
};

/**
 * Fetch only unread notifications for a user.
 * Convenience wrapper for fetchUserNotifications with unreadOnly=true.
 * 
 * @param {string} userId - User email or ID
 * @param {Object} options - Query options (limit, sortBy)
 * @returns {Promise<Array>} Array of unread notification records
 */
export const fetchUnreadNotifications = async (userId, options = {}) => {
  return fetchUserNotifications(userId, { ...options, unreadOnly: true });
};

/**
 * Mark all notifications for a user as read.
 * 
 * @param {string} userId - User email or ID
 * @returns {Promise<Object>} Update result with count of affected records
 */
export const markAllUserNotificationsAsRead = async (userId) => {
  try {
    const updated = await base44.entities.Notification.filter(
      { userId, isRead: false }
    );

    if (!updated || updated.length === 0) {
      return { affectedCount: 0 };
    }

    // Note: Base44 SDK may not support bulk updates via update(),
    // so we iterate. This is acceptable for notifications (non-critical).
    let affectedCount = 0;
    for (const notif of updated) {
      try {
        await base44.entities.Notification.update(notif.id, { isRead: true });
        affectedCount++;
      } catch (err) {
        console.error(`Failed to mark notification ${notif.id} as read:`, err);
      }
    }

    return { affectedCount };
  } catch (err) {
    console.error("Failed to mark all notifications as read:", err);
    throw err;
  }
};

/**
 * Delete a notification.
 * 
 * @param {string} notificationId - The notification ID
 * @returns {Promise<void>}
 */
export const deleteNotification = async (notificationId) => {
  try {
    await base44.entities.Notification.delete(notificationId);
  } catch (err) {
    console.error("Failed to delete notification:", err);
    throw err;
  }
};

/**
 * Get unread notification count for a user.
 * 
 * @param {string} userId - User email or ID
 * @returns {Promise<number>} Count of unread notifications
 */
export const getUnreadNotificationCount = async (userId) => {
  try {
    const unread = await fetchUnreadNotifications(userId, { limit: 9999 });
    return unread.length;
  } catch (err) {
    console.error("Failed to get unread notification count:", err);
    return 0; // Safe fallback for UI
  }
};