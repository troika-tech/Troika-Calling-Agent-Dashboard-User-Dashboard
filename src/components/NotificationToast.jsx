import React, { useEffect, useState } from 'react';
import { pushNotificationService } from '../services/pushNotifications';

/**
 * NotificationToast Component
 * Shows in-app notifications when push notifications are received while app is in foreground
 */
const NotificationToast = () => {
  const [notification, setNotification] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Listen for foreground push notifications
    const handleNotification = (event) => {
      const notif = event.detail;

      // Extract notification data
      const title = notif.title || notif.notification?.title || 'New Notification';
      const body = notif.body || notif.notification?.body || '';
      const data = notif.data || {};

      setNotification({
        title,
        body,
        type: data.type,
        icon: getNotificationIcon(data.type),
      });
      setVisible(true);

      // Auto-hide after 5 seconds
      setTimeout(() => {
        setVisible(false);
      }, 5000);
    };

    window.addEventListener('pushNotificationReceived', handleNotification);

    return () => {
      window.removeEventListener('pushNotificationReceived', handleNotification);
    };
  }, []);

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'new_lead':
        return '🎯';
      case 'campaign_update':
        return '📢';
      case 'daily_report':
      case 'weekly_report':
        return '📊';
      case 'test':
        return '🧪';
      default:
        return '🔔';
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'new_lead':
        return 'bg-green-500';
      case 'campaign_update':
        return 'bg-blue-500';
      case 'daily_report':
      case 'weekly_report':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  const handleClose = () => {
    setVisible(false);
  };

  if (!visible || !notification) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in-right max-w-sm">
      <div
        className={`${getNotificationColor(
          notification.type
        )} text-white rounded-lg shadow-lg p-4 flex items-start space-x-3`}
      >
        {/* Icon */}
        <div className="text-2xl flex-shrink-0">{notification.icon}</div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm mb-1">{notification.title}</h4>
          <p className="text-sm opacity-90 line-clamp-2">{notification.body}</p>
        </div>

        {/* Close button */}
        <button
          onClick={handleClose}
          className="flex-shrink-0 text-white hover:text-gray-200 transition-colors"
          aria-label="Close notification"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default NotificationToast;
