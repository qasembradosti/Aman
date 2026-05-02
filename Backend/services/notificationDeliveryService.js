import db from '../config/knex.js';
import Notification from '../models/notification.js';
import { sendPushNotification, sendPushNotificationBatch } from './expoPushService.js';

const DEFAULT_NOTIFICATION_ROUTE = '/notifications';

const normalizeDeliveryData = (data = {}) => {
  const normalized = { ...data };

  if (normalized.orderId && !normalized.order_id) {
    normalized.order_id = normalized.orderId;
  }

  if (normalized.productId && !normalized.product_id) {
    normalized.product_id = normalized.productId;
  }

  if (!normalized.route) {
    normalized.route = DEFAULT_NOTIFICATION_ROUTE;
  }

  return normalized;
};

const buildPushData = (notification, data = {}) => {
  const normalized = normalizeDeliveryData(data);

  return {
    ...normalized,
    ...(notification?.id ? { notificationId: notification.id } : {}),
  };
};

const buildSocketPayload = (notification, data = {}) => {
  const normalized = normalizeDeliveryData(data);

  return {
    ...notification,
    ...normalized,
    timestamp: new Date(),
  };
};

const extractInsertedId = (insertResult) => {
  if (Array.isArray(insertResult)) {
    const [first] = insertResult;
    return typeof first === 'object' ? first?.id : first;
  }

  return insertResult;
};

const logPushFailure = (scope, error) => {
  console.error(`Push notification failed for ${scope}:`, error?.message || error);
};

export const deliverNotificationToUser = async ({
  userId,
  title,
  message,
  isGlobal = false,
  data = {},
}) => {
  const notification = await Notification.create({
    user_id: userId,
    title,
    message,
    is_global: isGlobal,
  });

  const socketPayload = buildSocketPayload(notification, data);

  if (global.io) {
    global.io.to(`user:${userId}`).emit('new_notification', socketPayload);
  }

  const user = await db('users').where({ id: userId }).select('push_token').first();

  if (user?.push_token) {
    sendPushNotification(user.push_token, {
      title,
      body: message,
      data: buildPushData(notification, data),
    }).catch((error) => logPushFailure(`user ${userId}`, error));
  }

  return socketPayload;
};

export const deliverBroadcastNotification = async ({
  title,
  message,
  isGlobal = true,
  data = {},
}) => {
  const users = await db('users').select('id', 'push_token');

  if (users.length === 0) {
    return {
      count: 0,
      sampleNotification: null,
    };
  }

  const now = new Date();
  const notificationRows = users.map((user) => ({
    user_id: user.id,
    title,
    message,
    is_global: isGlobal,
    is_read: false,
    created_at: now,
    updated_at: now,
  }));

  const insertResult = await db('notifications').insert(notificationRows);
  const firstInsertedId = extractInsertedId(insertResult);
  const sampleNotification = firstInsertedId
    ? await Notification.findById(firstInsertedId)
    : null;

  const socketPayload = buildSocketPayload(
    {
      title,
      message,
      is_global: isGlobal,
      is_read: false,
      created_at: now,
      updated_at: now,
    },
    data,
  );

  if (global.io) {
    global.io.emit('broadcast_notification', socketPayload);
  }

  const pushTokens = users
    .map((user) => user.push_token)
    .filter(Boolean);

  if (pushTokens.length > 0) {
    sendPushNotificationBatch(pushTokens, {
      title,
      body: message,
      data: buildPushData(null, data),
    }).catch((error) => logPushFailure('broadcast', error));
  }

  return {
    count: users.length,
    sampleNotification: sampleNotification || socketPayload,
  };
};

export default {
  deliverBroadcastNotification,
  deliverNotificationToUser,
};
