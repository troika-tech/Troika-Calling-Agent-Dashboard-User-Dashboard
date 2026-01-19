/**
 * Notification Settings Component
 *
 * Allows users to configure their push notification preferences
 * - Enable/disable different notification types
 * - Configure daily report time
 * - Test notifications
 */

import React, { useState, useEffect } from 'react';
import { FaBell, FaCheckCircle, FaSpinner, FaExclamationCircle } from 'react-icons/fa';
import axios from 'axios';
import config from '../config';
import { pushNotificationService } from '../services/pushNotifications';
import { isMobilePlatform } from '../utils/platform';
import { useToast } from '../context/ToastContext';

const API_BASE_URL = config.apiBaseUrl;

const NotificationSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingNotification, setTestingNotification] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState('prompt');
  const { showToast } = useToast();

  const [settings, setSettings] = useState({
    campaignUpdates: true,
    dailyReports: true,
    weeklyReports: false,
    dailyReportTime: '09:00'
  });

  useEffect(() => {
    checkPermissionStatus();
    fetchSettings();
  }, []);

  const checkPermissionStatus = async () => {
    if (!isMobilePlatform()) {
      setPermissionStatus('not-supported');
      return;
    }

    try {
      const result = await pushNotificationService.checkPermissions();
      setPermissionStatus(result.receive);
    } catch (error) {
      console.error('Error checking permissions:', error);
    }
  };

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const response = await axios.get(
        `${API_BASE_URL}/api/v1/notifications/settings`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data.success && response.data.data) {
        setSettings(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching notification settings:', error);
      showToast?.('Failed to load notification settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const response = await axios.put(
        `${API_BASE_URL}/api/v1/notifications/settings`,
        settings,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        showToast?.('Notification settings saved', 'success');
      }
    } catch (error) {
      console.error('Error saving notification settings:', error);
      showToast?.('Failed to save notification settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleTestNotification = async () => {
    try {
      setTestingNotification(true);
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const response = await axios.post(
        `${API_BASE_URL}/api/v1/notifications/test`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        showToast?.('Test notification sent', 'success');
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      showToast?.('Failed to send test notification', 'error');
    } finally {
      setTestingNotification(false);
    }
  };

  const handleRequestPermission = async () => {
    try {
      const result = await pushNotificationService.requestPermissions();
      setPermissionStatus(result.receive);

      if (result.receive === 'granted') {
        showToast?.('Notification permission granted', 'success');
        // Re-initialize to register device
        await pushNotificationService.initialize();
      } else {
        showToast?.('Notification permission denied', 'error');
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      showToast?.('Failed to request notification permission', 'error');
    }
  };

  const handleToggle = (key) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleTimeChange = (e) => {
    setSettings(prev => ({
      ...prev,
      dailyReportTime: e.target.value
    }));
  };

  if (loading) {
    return (
      <div className="glass-card p-6">
        <div className="flex justify-center items-center py-8">
          <FaSpinner className="animate-spin text-emerald-500" size={24} />
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      <div className="flex items-center space-x-3 mb-6">
        <FaBell className="text-blue-500" size={20} />
        <h2 className="text-lg font-semibold text-zinc-900">
          Push Notifications
        </h2>
      </div>

      {/* Permission Status */}
      <div className="mb-6">
        {permissionStatus === 'not-supported' && (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-zinc-100 border border-zinc-200">
            <FaExclamationCircle className="text-zinc-500 flex-shrink-0 mt-0.5" size={18} />
            <div>
              <p className="text-sm font-medium text-zinc-700">Not Available on Web</p>
              <p className="text-xs text-zinc-500 mt-1">
                Push notifications are only available in the mobile app. Install the app to receive notifications.
              </p>
            </div>
          </div>
        )}

        {permissionStatus === 'denied' && (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 border border-red-200">
            <FaExclamationCircle className="text-red-500 flex-shrink-0 mt-0.5" size={18} />
            <div>
              <p className="text-sm font-medium text-red-700">Permission Denied</p>
              <p className="text-xs text-red-600 mt-1">
                Notification permission was denied. Enable it in your device settings to receive notifications.
              </p>
            </div>
          </div>
        )}

        {permissionStatus === 'prompt' && isMobilePlatform() && (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-50 border border-blue-200">
            <FaBell className="text-blue-500 flex-shrink-0 mt-0.5" size={18} />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-700">Enable Notifications</p>
              <p className="text-xs text-blue-600 mt-1 mb-3">
                Allow notifications to receive campaign updates and reports.
              </p>
              <button
                onClick={handleRequestPermission}
                className="px-4 py-2 bg-blue-500 text-white text-xs font-medium rounded-lg hover:bg-blue-600 transition-colors"
              >
                Enable Notifications
              </button>
            </div>
          </div>
        )}

        {permissionStatus === 'granted' && (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-emerald-50 border border-emerald-200">
            <FaCheckCircle className="text-emerald-500 flex-shrink-0 mt-0.5" size={18} />
            <div>
              <p className="text-sm font-medium text-emerald-700">Notifications Enabled</p>
              <p className="text-xs text-emerald-600 mt-1">
                You will receive push notifications based on your preferences below.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Notification Preferences */}
      <div className="space-y-4 mb-6">
        <h3 className="text-sm font-semibold text-zinc-700">Notification Types</h3>

        {/* Campaign Updates */}
        <div className="flex items-center justify-between p-4 rounded-lg border border-zinc-200 hover:border-zinc-300 transition-colors">
          <div className="flex-1">
            <p className="text-sm font-medium text-zinc-800">Campaign Updates</p>
            <p className="text-xs text-zinc-500 mt-1">
              Get notified when your campaigns start, pause, resume, or complete
            </p>
          </div>
          <button
            onClick={() => handleToggle('campaignUpdates')}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.campaignUpdates ? 'bg-emerald-500' : 'bg-zinc-300'
            }`}
            disabled={permissionStatus !== 'granted'}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.campaignUpdates ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Daily Reports */}
        <div className="flex items-center justify-between p-4 rounded-lg border border-zinc-200 hover:border-zinc-300 transition-colors">
          <div className="flex-1">
            <p className="text-sm font-medium text-zinc-800">Daily Reports</p>
            <p className="text-xs text-zinc-500 mt-1">
              Receive daily summary of your campaign statistics
            </p>
          </div>
          <button
            onClick={() => handleToggle('dailyReports')}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.dailyReports ? 'bg-emerald-500' : 'bg-zinc-300'
            }`}
            disabled={permissionStatus !== 'granted'}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.dailyReports ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Daily Report Time */}
        {settings.dailyReports && (
          <div className="pl-4 flex items-center gap-3">
            <label className="text-xs text-zinc-600 font-medium">Report Time:</label>
            <input
              type="time"
              value={settings.dailyReportTime}
              onChange={handleTimeChange}
              className="px-3 py-1.5 text-xs border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              disabled={permissionStatus !== 'granted'}
            />
          </div>
        )}

        {/* Weekly Reports */}
        <div className="flex items-center justify-between p-4 rounded-lg border border-zinc-200 hover:border-zinc-300 transition-colors">
          <div className="flex-1">
            <p className="text-sm font-medium text-zinc-800">Weekly Reports</p>
            <p className="text-xs text-zinc-500 mt-1">
              Receive weekly summary every Monday
            </p>
          </div>
          <button
            onClick={() => handleToggle('weeklyReports')}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.weeklyReports ? 'bg-emerald-500' : 'bg-zinc-300'
            }`}
            disabled={permissionStatus !== 'granted'}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.weeklyReports ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleSaveSettings}
          disabled={saving || permissionStatus !== 'granted'}
          className="flex-1 px-4 py-2.5 bg-emerald-500 text-white text-sm font-medium rounded-lg hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <FaSpinner className="animate-spin" size={14} />
              Saving...
            </>
          ) : (
            <>
              <FaCheckCircle size={14} />
              Save Settings
            </>
          )}
        </button>

        <button
          onClick={handleTestNotification}
          disabled={testingNotification || permissionStatus !== 'granted'}
          className="px-4 py-2.5 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {testingNotification ? (
            <>
              <FaSpinner className="animate-spin" size={14} />
              Sending...
            </>
          ) : (
            <>
              <FaBell size={14} />
              Test Notification
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default NotificationSettings;
