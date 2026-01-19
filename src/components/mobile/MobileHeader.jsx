/**
 * Mobile Header Component
 *
 * Compact header for mobile devices with hamburger menu and notifications
 */

import React from 'react';
import { FaBars, FaBell } from 'react-icons/fa';

const MobileHeader = ({ onMenuClick, notificationCount = 0 }) => {
  return (
    <header className="fixed top-0 left-0 right-0 bg-white border-b border-zinc-200 shadow-sm z-50 lg:hidden" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="flex items-center justify-between h-14 px-4">
        {/* Left: Menu button */}
        <button
          onClick={onMenuClick}
          className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-zinc-100 transition-colors"
          aria-label="Open menu"
        >
          <FaBars size={20} className="text-zinc-700" />
        </button>

        {/* Center: Logo/Title */}
        <div className="flex items-center gap-2">
          <img
            src="/images/logo.png"
            alt="Logo"
            className="h-8 w-auto"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
          <span className="text-sm font-semibold text-zinc-800">
            Calling Dashboard
          </span>
        </div>

        {/* Right: Notification bell */}
        <button
          className="relative flex items-center justify-center w-10 h-10 rounded-lg hover:bg-zinc-100 transition-colors"
          aria-label="Notifications"
        >
          <FaBell size={18} className="text-zinc-700" />
          {notificationCount > 0 && (
            <span className="absolute top-1 right-1 flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-red-500 rounded-full">
              {notificationCount > 9 ? '9+' : notificationCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};

export default MobileHeader;
