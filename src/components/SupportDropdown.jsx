import React, { useEffect, useRef } from 'react';
import { FaPhoneAlt, FaEnvelope } from 'react-icons/fa';

const SupportDropdown = ({ onClose }) => {
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        // Check if clicked on the support button itself
        const supportBtn = event.target.closest('button[title="Support"]');
        if (!supportBtn) {
          onClose();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div
      ref={dropdownRef}
      className="absolute top-full right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-100 p-4 z-[100]"
      style={{
        width: '260px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.12)',
        animation: 'dropdownFadeIn 0.15s ease-out'
      }}
    >
      {/* Title */}
      <h2 className="text-sm font-semibold text-gray-900 mb-2">Troika Tech Support</h2>

      {/* Content */}
      <div className="space-y-1">
        {/* Phone */}
        <div className="flex items-center gap-2">
          <FaPhoneAlt className="text-emerald-600 flex-shrink-0" size={14} />
          <span className="text-sm text-gray-900">+91 98212 11755</span>
        </div>

        {/* Email */}
        <div className="flex items-center gap-2">
          <FaEnvelope className="text-emerald-600 flex-shrink-0" size={14} />
          <span className="text-sm text-gray-900">info@troikatech.in</span>
        </div>

        {/* Business Hours */}
        <div className="text-xs text-gray-400 pt-1">
          <p>Business hours: Monday to Saturday</p>
          <p>Timings: 10am - 6pm</p>
        </div>
      </div>

      {/* CSS Animation */}
      <style>{`
        @keyframes dropdownFadeIn {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default SupportDropdown;
