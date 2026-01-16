import { Expo } from 'expo-server-sdk';

// Create a new Expo SDK client
const expo = new Expo();

/**
 * Send push notification to a single device using Expo Push Token
 * @param {string} pushToken - Expo push token
 * @param {Object} notification - Notification object {title, body, data}
 */
export const sendPushNotification = async (pushToken, notification) => {
  try {
    // Check that the token is valid
    if (!Expo.isExpoPushToken(pushToken)) {
      console.error(`❌ Invalid Expo push token: ${pushToken}`);
      return { success: false, error: 'Invalid push token' };
    }

    const message = {
      to: pushToken,
      sound: 'default',
      title: notification.title,
      body: notification.body || notification.message,
      data: notification.data || {},
      priority: 'high',
      channelId: 'default',
    };

    // Send the notification
    const ticketChunk = await expo.sendPushNotificationsAsync([message]);
    console.log('📤 Push notification sent:', ticketChunk);

    return { success: true, ticket: ticketChunk[0] };
  } catch (error) {
    console.error('❌ Error sending push notification:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send push notifications to multiple devices
 * @param {Array<string>} pushTokens - Array of Expo push tokens
 * @param {Object} notification - Notification object {title, body, data}
 */
export const sendPushNotificationBatch = async (pushTokens, notification) => {
  try {
    // Filter out invalid tokens
    const validTokens = pushTokens.filter(token => Expo.isExpoPushToken(token));
    
    if (validTokens.length === 0) {
      console.log('⚠️ No valid push tokens to send to');
      return { success: true, sent: 0 };
    }

    // Create messages for all tokens
    const messages = validTokens.map(token => ({
      to: token,
      sound: 'default',
      title: notification.title,
      body: notification.body || notification.message,
      data: notification.data || {},
      priority: 'high',
      channelId: 'default',
    }));

    // Send notifications in chunks (Expo recommends max 100 per request)
    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error('❌ Error sending chunk:', error);
      }
    }

    console.log(`📤 Push notifications sent to ${validTokens.length} devices`);
    return { success: true, sent: validTokens.length, tickets };
  } catch (error) {
    console.error('❌ Error sending batch push notifications:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Check receipt status for sent notifications
 * @param {Array<string>} receiptIds - Array of receipt IDs from tickets
 */
export const checkPushReceipts = async (receiptIds) => {
  try {
    const receiptIdChunks = expo.chunkPushNotificationReceiptIds(receiptIds);
    const receipts = [];

    for (const chunk of receiptIdChunks) {
      try {
        const receiptChunk = await expo.getPushNotificationReceiptsAsync(chunk);
        receipts.push(receiptChunk);
      } catch (error) {
        console.error('❌ Error checking receipts:', error);
      }
    }

    return receipts;
  } catch (error) {
    console.error('❌ Error checking push receipts:', error);
    return [];
  }
};

export default {
  sendPushNotification,
  sendPushNotificationBatch,
  checkPushReceipts,
};
