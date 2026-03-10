/**
 * NOTIFICATION SERVICE CLIENT (Frontend)
 * 
 * Frontend SDK wrapper for the canonical notification service.
 * All UI components use this to interact with notifications.
 * 
 * Routes through functions/notificationService.js backend.
 */

import { base44 } from '@/api/base44Client';

/**
 * Fetch unread notifications for current user
 * @param {string} userId - User email or ID
 * @param {Object} options - { limit, type }
 * @returns {Promise<Array>}
 */
export async function fetchUnreadNotifications(userId, options = {}) {
  try {
    const response = await base44.functions.invoke('notificationService', {
      action: 'fetchUserNotifications',
      userId,
      isRead: false,
      limit: options.limit || 50,
      type: options.type || null,
    });
    return response.data?.notifications || [];
  } catch (error) {
    console.error('Failed to fetch unread notifications:', error);
    throw error;
  }
}

/**
 * Fetch all notifications for current user (read and unread)
 * @param {string} userId - User email or ID
 * @param {Object} options - { limit, type }
 * @returns {Promise<Array>}
 */
export async function fetchAllNotifications(userId, options = {}) {
  try {
    const response = await base44.functions.invoke('notificationService', {
      action: 'fetchUserNotifications',
      userId,
      limit: options.limit || 100,
      type: options.type || null,
    });
    return response.data?.notifications || [];
  } catch (error) {
    console.error('Failed to fetch all notifications:', error);
    throw error;
  }
}

/**
 * Create a new notification
 * @param {Object} payload - { userId, type, title, message, relatedEntityType, relatedEntityId }
 * @returns {Promise<Object>} Created notification
 */
export async function createNotification(payload) {
  try {
    const response = await base44.functions.invoke('notificationService', {
      action: 'createNotification',
      ...payload,
    });
    return response.data?.notification || null;
  } catch (error) {
    console.error('Failed to create notification:', error);
    throw error;
  }
}

/**
 * Mark a single notification as read
 * @param {string} notificationId - ID of notification to mark read
 * @returns {Promise<Object>} Updated notification
 */
export async function markNotificationRead(notificationId) {
  try {
    const response = await base44.functions.invoke('notificationService', {
      action: 'markNotificationRead',
      notificationId,
    });
    return response.data?.notification || null;
  } catch (error) {
    console.error('Failed to mark notification read:', error);
    throw error;
  }
}

/**
 * Mark all notifications as read for a user
 * Convenience helper (uses entity API directly)
 * @param {string} userId - User email or ID
 * @returns {Promise<void>}
 */
export async function markAllNotificationsRead(userId) {
  try {
    const unread = await fetchUnreadNotifications(userId);
    for (const notif of unread) {
      await base44.entities.Notification.update(notif.id, { isRead: true });
    }
  } catch (error) {
    console.error('Failed to mark all notifications read:', error);
    throw error;
  }
}

export default {
  fetchUnreadNotifications,
  fetchAllNotifications,
  createNotification,
  markNotificationRead,
  markAllNotificationsRead,
};