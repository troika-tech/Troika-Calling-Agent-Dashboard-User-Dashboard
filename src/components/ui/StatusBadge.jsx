/**
 * StatusBadge Component
 * Reusable status badge with consistent styling across the app
 */

import React from 'react';
import { getStatusConfig } from '../../utils';

/**
 * StatusBadge - Displays a status with appropriate styling
 * @param {Object} props
 * @param {string} props.status - Status string (e.g., 'completed', 'failed', 'in-progress')
 * @param {string} props.size - Size variant: 'xs', 'sm', 'md' (default: 'sm')
 * @param {boolean} props.showDot - Show status dot indicator (default: true)
 * @param {string} props.className - Additional CSS classes
 */
const StatusBadge = ({ 
  status, 
  size = 'sm', 
  showDot = true, 
  className = '' 
}) => {
  const config = getStatusConfig(status);

  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-[9px]',
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-xs',
  };

  const dotSizes = {
    xs: 'h-1 w-1',
    sm: 'h-1.5 w-1.5',
    md: 'h-2 w-2',
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1 rounded-full font-medium whitespace-nowrap
        border ${config.border} ${config.bg} ${config.text}
        ${sizeClasses[size] || sizeClasses.sm}
        ${className}
      `}
    >
      {showDot && (
        <span 
          className={`
            rounded-full flex-shrink-0
            ${config.dot}
            ${dotSizes[size] || dotSizes.sm}
          `} 
        />
      )}
      {config.label}
    </span>
  );
};

/**
 * CallTypeBadge - Displays call direction (Incoming/Outgoing)
 * @param {Object} props
 * @param {string} props.direction - 'inbound' or 'outbound'
 * @param {string} props.size - Size variant: 'xs', 'sm', 'md'
 * @param {string} props.className - Additional CSS classes
 */
export const CallTypeBadge = ({ 
  direction, 
  size = 'sm', 
  className = '' 
}) => {
  const isInbound = direction === 'inbound';
  
  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-[9px]',
    sm: 'px-2.5 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
  };

  const iconSizes = {
    xs: 8,
    sm: 10,
    md: 12,
  };

  const iconSize = iconSizes[size] || iconSizes.sm;

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full font-medium
        border
        ${isInbound 
          ? 'bg-blue-50 text-blue-700 border-blue-200' 
          : 'bg-purple-50 text-purple-700 border-purple-200'
        }
        ${sizeClasses[size] || sizeClasses.sm}
        ${className}
      `}
    >
      {isInbound ? (
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 5v14M5 12l7 7 7-7" />
        </svg>
      ) : (
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 19V5M5 12l7-7 7 7" />
        </svg>
      )}
      {isInbound ? 'Incoming' : 'Outgoing'}
    </span>
  );
};

/**
 * CreditBadge - Displays credit amount with type styling
 * @param {Object} props
 * @param {string} props.type - 'add' or 'remove'
 * @param {number} props.amount - Credit amount
 * @param {string} props.size - Size variant
 * @param {string} props.className - Additional CSS classes
 */
export const CreditBadge = ({ 
  type, 
  amount, 
  size = 'sm', 
  className = '' 
}) => {
  const isAdd = type === 'add';
  
  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-[9px]',
    sm: 'px-2 py-0.5 text-[11px]',
    md: 'px-2.5 py-1 text-xs',
  };

  return (
    <span
      className={`
        inline-flex rounded-full font-medium border
        ${isAdd 
          ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
          : 'bg-red-50 text-red-500 border-red-100'
        }
        ${sizeClasses[size] || sizeClasses.sm}
        ${className}
      `}
    >
      {isAdd ? '+' : '-'}{Math.abs(amount)} credits
    </span>
  );
};

export default StatusBadge;


