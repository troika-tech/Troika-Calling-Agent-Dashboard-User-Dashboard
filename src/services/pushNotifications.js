/**
 * Push Notifications Service
 *
 * Handles Firebase Cloud Messaging (FCM) push notifications
 * - Request notification permissions
 * - Register/unregister device tokens with backend
 * - Handle incoming notifications (foreground and background)
 * - Deep linking support for navigation
 */

import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import axios from 'axios';
import config from '../config';

const API_BASE_URL = config.apiBaseUrl;

class PushNotificationService {
  constructor() {
    this.isInitialized = false;
    this.currentToken = null;
  }

  /**
   * Check if push notifications are supported on this platform
   */
  isSupported() {
    return Capacitor.isPluginAvailable('PushNotifications');
  }

  /**
   * Initialize push notifications
   * Should be called after user logs in
   */
  async initialize() {
    if (this.isInitialized) {
      console.log('Push notifications already initialized');
      return;
    }

    if (!this.isSupported()) {
      console.log('Push notifications not supported on this platform');
      return;
    }

    try {
      // Request permission
      const permissionResult = await this.requestPermissions();

      if (permissionResult.receive === 'granted') {
        // Register for push notifications
        await PushNotifications.register();

        // Listen for registration success
        await PushNotifications.addListener('registration', async (token) => {
          console.log('Push registration success:', token.value);
          this.currentToken = token.value;

          // Send token to backend
          await this.registerDeviceToken(token.value);
        });

        // Listen for registration errors
        await PushNotifications.addListener('registrationError', (error) => {
          console.error('Push registration error:', error);
        });

        // Listen for push notifications received (foreground)
        await PushNotifications.addListener(
          'pushNotificationReceived',
          (notification) => {
            console.log('Push notification received:', notification);
            this.handleForegroundNotification(notification);
          }
        );

        // Listen for notification actions (user tapped notification)
        await PushNotifications.addListener(
          'pushNotificationActionPerformed',
          (notification) => {
            console.log('Push notification action performed:', notification);
            this.handleNotificationTap(notification);
          }
        );

        this.isInitialized = true;
        console.log('Push notifications initialized successfully');
      } else {
        console.log('Push notification permission denied');
      }
    } catch (error) {
      console.error('Error initializing push notifications:', error);
    }
  }

  /**
   * Request notification permissions
   */
  async requestPermissions() {
    try {
      const result = await PushNotifications.requestPermissions();
      console.log('Permission request result:', result);
      return result;
    } catch (error) {
      console.error('Error requesting permissions:', error);
      throw error;
    }
  }

  /**
   * Check current permission status
   */
  async checkPermissions() {
    try {
      return await PushNotifications.checkPermissions();
    } catch (error) {
      console.error('Error checking permissions:', error);
      throw error;
    }
  }

  /**
   * Register device token with backend
   */
  async registerDeviceToken(fcmToken) {
    try {
      const authToken = localStorage.getItem('authToken');
      if (!authToken) {
        console.error('No auth token found, cannot register device');
        return;
      }

      const platform = Capacitor.getPlatform();
      const response = await axios.post(
        `${API_BASE_URL}/api/v1/notifications/register-device`,
        {
          fcmToken,
          platform,
          deviceInfo: {
            model: navigator.userAgent,
            os: platform,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      console.log('Device token registered successfully:', response.data);

      // Store registration state
      localStorage.setItem('fcmTokenRegistered', 'true');
      localStorage.setItem('fcmToken', fcmToken);

      return response.data;
    } catch (error) {
      console.error('Error registering device token:', error);
      throw error;
    }
  }

  /**
   * Unregister device token from backend
   * Should be called on logout
   */
  async unregisterDeviceToken() {
    try {
      const fcmToken = this.currentToken || localStorage.getItem('fcmToken');
      if (!fcmToken) {
        console.log('No FCM token to unregister');
        return;
      }

      const authToken = localStorage.getItem('authToken');
      if (!authToken) {
        console.error('No auth token found');
        return;
      }

      const response = await axios.post(
        `${API_BASE_URL}/api/v1/notifications/unregister-device`,
        {
          fcmToken,
        },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      console.log('Device token unregistered successfully:', response.data);

      // Clear registration state
      localStorage.removeItem('fcmTokenRegistered');
      localStorage.removeItem('fcmToken');
      this.currentToken = null;

      return response.data;
    } catch (error) {
      console.error('Error unregistering device token:', error);
      throw error;
    }
  }

  /**
   * Handle foreground notifications
   * Show in-app alert/toast when app is open
   */
  handleForegroundNotification(notification) {
    console.log('Handling foreground notification:', notification);

    // Create a custom event that components can listen to
    const event = new CustomEvent('pushNotificationReceived', {
      detail: notification,
    });
    window.dispatchEvent(event);

    // You can also show a toast or in-app notification here
    // For now, we'll let components handle it via the event
  }

  /**
   * Handle notification tap
   * Navigate to relevant page based on notification data
   */
  handleNotificationTap(notificationAction) {
    console.log('Handling notification tap:', notificationAction);

    const notification = notificationAction.notification;
    const data = notification.data;

    // Create a custom event for navigation
    const event = new CustomEvent('pushNotificationTapped', {
      detail: {
        type: data.type,
        campaignId: data.campaignId,
        campaignName: data.campaignName,
        action: data.action,
        data: data,
      },
    });
    window.dispatchEvent(event);

    // Deep linking based on notification type
    if (data.type === 'campaign_update') {
      if (data.campaignId) {
        // Navigate to campaign details
        window.location.href = `/campaigns/${data.campaignId}`;
      } else {
        // Navigate to campaigns list
        window.location.href = '/campaigns';
      }
    } else if (data.type === 'daily_report' || data.type === 'weekly_report') {
      // Navigate to analytics/dashboard
      window.location.href = '/analytics';
    } else {
      // Default: navigate to dashboard
      window.location.href = '/dashboard';
    }
  }

  /**
   * Get list of delivered notifications
   */
  async getDeliveredNotifications() {
    try {
      const result = await PushNotifications.getDeliveredNotifications();
      console.log('Delivered notifications:', result);
      return result.notifications;
    } catch (error) {
      console.error('Error getting delivered notifications:', error);
      return [];
    }
  }

  /**
   * Remove delivered notifications
   */
  async removeDeliveredNotifications(notificationIds) {
    try {
      await PushNotifications.removeDeliveredNotifications({
        notifications: notificationIds.map((id) => ({ id })),
      });
      console.log('Removed delivered notifications');
    } catch (error) {
      console.error('Error removing delivered notifications:', error);
    }
  }

  /**
   * Remove all delivered notifications
   */
  async removeAllDeliveredNotifications() {
    try {
      await PushNotifications.removeAllDeliveredNotifications();
      console.log('Removed all delivered notifications');
    } catch (error) {
      console.error('Error removing all delivered notifications:', error);
    }
  }

  /**
   * Clean up - remove listeners
   */
  async cleanup() {
    if (!this.isSupported()) {
      return;
    }

    try {
      await PushNotifications.removeAllListeners();
      this.isInitialized = false;
      console.log('Push notification listeners removed');
    } catch (error) {
      console.error('Error cleaning up push notifications:', error);
    }
  }
}

// Export singleton instance
export const pushNotificationService = new PushNotificationService();

// Export class for testing
export default PushNotificationService;
