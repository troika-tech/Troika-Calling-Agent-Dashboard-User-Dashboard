import React from 'react';
import { FaClock, FaSignOutAlt } from 'react-icons/fa';

/**
 * Modal shown when user is about to be logged out due to inactivity
 */
const InactivityWarningModal = ({ remainingTime, onExtendSession, onLogout }) => {
  // Convert milliseconds to minutes and seconds
  const minutes = Math.floor(remainingTime / 60000);
  const seconds = Math.floor((remainingTime % 60000) / 1000);
  const timeDisplay = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4">
          <div className="flex items-center gap-3 text-white">
            <div className="p-2 bg-white/20 rounded-full">
              <FaClock size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Session Timeout Warning</h3>
              <p className="text-amber-100 text-sm">Your session is about to expire</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-50 border-4 border-amber-200 mb-4">
              <span className="text-2xl font-bold text-amber-600">{timeDisplay}</span>
            </div>
            <p className="text-zinc-600">
              Due to inactivity, you will be automatically logged out in{' '}
              <span className="font-semibold text-amber-600">{timeDisplay}</span>.
            </p>
          </div>

          <p className="text-sm text-zinc-500 text-center mb-6">
            Click "Continue Session" to stay logged in, or you will be redirected to the login page.
          </p>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onLogout}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-zinc-200 text-zinc-600 font-medium hover:bg-zinc-50 transition-colors"
            >
              <FaSignOutAlt size={16} />
              Logout Now
            </button>
            <button
              onClick={onExtendSession}
              className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg shadow-emerald-500/30"
            >
              Continue Session
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InactivityWarningModal;

