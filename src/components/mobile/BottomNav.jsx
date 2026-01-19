/**
 * Mobile Bottom Navigation
 *
 * Fixed bottom navigation bar for mobile devices
 * Provides quick access to main sections of the app
 */

import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  FaHome,
  FaBullhorn,
  FaChartBar,
  FaPhoneAlt,
  FaCog
} from 'react-icons/fa';

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    {
      id: 'dashboard',
      label: 'Home',
      icon: FaHome,
      path: '/dashboard',
      activeColor: 'text-emerald-600',
      inactiveColor: 'text-zinc-400'
    },
    {
      id: 'campaigns',
      label: 'Campaigns',
      icon: FaBullhorn,
      path: '/campaigns',
      activeColor: 'text-blue-600',
      inactiveColor: 'text-zinc-400'
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: FaChartBar,
      path: '/analytics',
      activeColor: 'text-purple-600',
      inactiveColor: 'text-zinc-400'
    },
    {
      id: 'calls',
      label: 'Calls',
      icon: FaPhoneAlt,
      path: '/call-logs',
      activeColor: 'text-orange-600',
      inactiveColor: 'text-zinc-400'
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: FaCog,
      path: '/settings',
      activeColor: 'text-zinc-700',
      inactiveColor: 'text-zinc-400'
    }
  ];

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const handleNavigation = (path) => {
    navigate(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-200 shadow-lg z-50 lg:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const active = isActive(item.path);
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => handleNavigation(item.path)}
              className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${
                active ? 'opacity-100' : 'opacity-60 hover:opacity-80'
              }`}
            >
              <Icon
                size={20}
                className={active ? item.activeColor : item.inactiveColor}
              />
              <span
                className={`text-[10px] font-medium ${
                  active ? item.activeColor : item.inactiveColor
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
