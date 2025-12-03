import { useEffect, useRef, useState, useCallback } from 'react';
import config from '../config';

/**
 * Custom hook for WebSocket-based real-time credit updates
 * Automatically connects, handles reconnection, and provides credit update callbacks
 * 
 * @param {string} userId - The user ID to subscribe to credit updates for
 * @param {function} onCreditUpdate - Callback function when credits are updated
 * @returns {object} { connected, reconnecting, error }
 */
export const useCreditWebSocket = (userId, onCreditUpdate) => {
  const ws = useRef(null);
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [error, setError] = useState(null);
  const reconnectTimeout = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 10;
  const onCreditUpdateRef = useRef(onCreditUpdate);

  // Keep callback ref updated
  useEffect(() => {
    onCreditUpdateRef.current = onCreditUpdate;
  }, [onCreditUpdate]);

  const connect = useCallback(() => {
    if (!userId) {
      console.log('useCreditWebSocket: No userId provided, skipping connection');
      return;
    }

    // Don't connect if already connected or connecting
    if (ws.current && (ws.current.readyState === WebSocket.CONNECTING || ws.current.readyState === WebSocket.OPEN)) {
      return;
    }

    // Get auth token from localStorage
    const token = localStorage.getItem('authToken');

    // Build WebSocket URL
    const wsUrl = config.wsBaseUrl || `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`;
    const url = `${wsUrl}/ws/dashboard?userId=${encodeURIComponent(userId)}${token ? `&token=${encodeURIComponent(token)}` : ''}`;

    console.log('🔌 Connecting to credit WebSocket...', { wsUrl, userId });

    try {
      ws.current = new WebSocket(url);
    } catch (err) {
      console.error('❌ Failed to create WebSocket:', err);
      setError('Failed to create WebSocket connection');
      scheduleReconnect();
      return;
    }

    ws.current.onopen = () => {
      console.log('✅ Credit WebSocket connected');
      setConnected(true);
      setReconnecting(false);
      setError(null);
      reconnectAttempts.current = 0;
    };

    ws.current.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        console.log('📨 Credit WebSocket message:', message);

        // Handle different message types
        switch (message.type) {
          case 'connected':
            console.log('🔗 Dashboard WebSocket authenticated:', message.data);
            break;

          case 'credit:deducted':
          case 'credit:added':
            // Call the callback with credit update data
            if (onCreditUpdateRef.current) {
              onCreditUpdateRef.current({
                type: message.type,
                ...message.data
              });
            }
            break;

          case 'pong':
            // Heartbeat response, no action needed
            break;

          default:
            console.log('Unknown WebSocket message type:', message.type);
        }
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
      }
    };

    ws.current.onerror = (err) => {
      console.error('❌ Credit WebSocket error:', err);
      setError('WebSocket connection error');
    };

    ws.current.onclose = (event) => {
      console.log('🔌 Credit WebSocket disconnected', { code: event.code, reason: event.reason });
      setConnected(false);

      // Don't reconnect if closed cleanly (code 1000) or if we exceeded max attempts
      if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
        scheduleReconnect();
      } else if (reconnectAttempts.current >= maxReconnectAttempts) {
        setError('Max reconnection attempts reached');
        setReconnecting(false);
      }
    };
  }, [userId]);

  const scheduleReconnect = useCallback(() => {
    // Clear any existing timeout
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }

    // Calculate delay with exponential backoff (max 30 seconds)
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
    reconnectAttempts.current++;

    console.log(`🔄 Reconnecting in ${delay / 1000}s (attempt ${reconnectAttempts.current}/${maxReconnectAttempts})...`);
    setReconnecting(true);

    reconnectTimeout.current = setTimeout(() => {
      connect();
    }, delay);
  }, [connect]);

  const disconnect = useCallback(() => {
    // Clear reconnect timeout
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }

    // Close WebSocket
    if (ws.current) {
      ws.current.close(1000, 'Component unmounted');
      ws.current = null;
    }

    setConnected(false);
    setReconnecting(false);
    reconnectAttempts.current = 0;
  }, []);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Send ping every 30 seconds to keep connection alive
  useEffect(() => {
    if (!connected) return;

    const pingInterval = setInterval(() => {
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);

    return () => clearInterval(pingInterval);
  }, [connected]);

  return {
    connected,
    reconnecting,
    error,
    disconnect,
    reconnect: connect
  };
};

export default useCreditWebSocket;
