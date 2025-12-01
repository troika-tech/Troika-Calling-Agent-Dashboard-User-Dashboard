import React, { createContext, useContext, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaCheckCircle, FaTimesCircle, FaExclamationTriangle, FaInfoCircle, FaTimes, FaSignOutAlt } from "react-icons/fa";

// Toast Context
const ToastContext = createContext(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

const toastStyles = {
  success: {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-800",
    icon: <FaCheckCircle className="h-5 w-5 text-emerald-500" />,
  },
  error: {
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-800",
    icon: <FaTimesCircle className="h-5 w-5 text-red-500" />,
  },
  warning: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-800",
    icon: <FaExclamationTriangle className="h-5 w-5 text-amber-500" />,
  },
  info: {
    bg: "bg-sky-50",
    border: "border-sky-200",
    text: "text-sky-800",
    icon: <FaInfoCircle className="h-5 w-5 text-sky-500" />,
  },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [alertDialog, setAlertDialog] = useState(null);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (message, type = "info", duration = 3000) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newToast = { id, message, type, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const success = useCallback(
    (message, duration) => showToast(message, "success", duration),
    [showToast]
  );

  const error = useCallback(
    (message, duration) => showToast(message, "error", duration ?? 4000),
    [showToast]
  );

  const warning = useCallback(
    (message, duration) => showToast(message, "warning", duration),
    [showToast]
  );

  const info = useCallback(
    (message, duration) => showToast(message, "info", duration),
    [showToast]
  );

  const confirm = useCallback((options) => {
    setConfirmDialog(options);
  }, []);

  const alert = useCallback((options) => {
    setAlertDialog(options);
  }, []);

  const handleAlertOk = () => {
    if (alertDialog?.onOk) {
      alertDialog.onOk();
    }
    setAlertDialog(null);
  };

  const handleConfirm = () => {
    if (confirmDialog?.onConfirm) {
      confirmDialog.onConfirm();
    }
    setConfirmDialog(null);
  };

  const handleCancel = () => {
    if (confirmDialog?.onCancel) {
      confirmDialog.onCancel();
    }
    setConfirmDialog(null);
  };

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info, confirm, alert }}>
      {children}

      {/* Toast Container - Top Center */}
      <div className="fixed top-4 left-0 right-0 pointer-events-none z-[100] flex justify-center">
        <div className="flex flex-col gap-2 pointer-events-auto">
          <AnimatePresence mode="sync">
            {toasts.map((toast) => {
              const style = toastStyles[toast.type];
              return (
                <motion.div
                  key={toast.id}
                  initial={{ opacity: 0, scale: 0.9, y: -20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -20 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg ${style.bg} ${style.border} min-w-[300px] max-w-[450px]`}
                >
                  {style.icon}
                  <p className={`flex-1 text-sm font-medium ${style.text}`}>
                    {toast.message}
                  </p>
                  <button
                    onClick={() => removeToast(toast.id)}
                    className={`p-1 rounded-full hover:bg-black/5 transition-colors ${style.text}`}
                  >
                    <FaTimes className="h-4 w-4" />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Confirm Dialog - Centered */}
      <AnimatePresence>
        {confirmDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/30 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="bg-white rounded-2xl border border-zinc-200 shadow-2xl shadow-black/10 p-5 min-w-[320px] max-w-[400px] mx-4"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                  <FaSignOutAlt className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-900">Confirm Action</p>
                  <p className="text-xs text-zinc-500">Please confirm your action</p>
                </div>
              </div>

              <p className="text-sm text-zinc-700 mb-5">
                {confirmDialog.message}
              </p>

              <div className="flex justify-end gap-2">
                <button
                  onClick={handleCancel}
                  className="inline-flex items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100 transition-colors"
                >
                  {confirmDialog.cancelText || "No"}
                </button>
                <button
                  onClick={handleConfirm}
                  className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-4 py-2 text-xs font-medium text-white shadow-sm shadow-emerald-300 hover:bg-emerald-600 transition-colors"
                >
                  {confirmDialog.confirmText || "Yes"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Alert Dialog - Modal with OK button */}
      <AnimatePresence>
        {alertDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/30 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="bg-white rounded-2xl border border-zinc-200 shadow-2xl shadow-black/10 p-5 min-w-[320px] max-w-[400px] mx-4"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                  alertDialog.type === "success" ? "bg-emerald-100" :
                  alertDialog.type === "error" ? "bg-red-100" :
                  alertDialog.type === "warning" ? "bg-amber-100" : "bg-sky-100"
                }`}>
                  {alertDialog.type === "success" ? (
                    <FaCheckCircle className="h-5 w-5 text-emerald-600" />
                  ) : alertDialog.type === "error" ? (
                    <FaTimesCircle className="h-5 w-5 text-red-600" />
                  ) : alertDialog.type === "warning" ? (
                    <FaExclamationTriangle className="h-5 w-5 text-amber-600" />
                  ) : (
                    <FaInfoCircle className="h-5 w-5 text-sky-600" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-900">
                    {alertDialog.type === "success" ? "Success" :
                     alertDialog.type === "error" ? "Error" :
                     alertDialog.type === "warning" ? "Warning" : "Information"}
                  </p>
                </div>
              </div>

              <p className="text-sm text-zinc-700 mb-5">
                {alertDialog.message}
              </p>

              <div className="flex justify-end">
                <button
                  onClick={handleAlertOk}
                  className={`inline-flex items-center justify-center rounded-full px-6 py-2 text-xs font-medium text-white shadow-sm transition-colors ${
                    alertDialog.type === "success" ? "bg-emerald-500 shadow-emerald-300 hover:bg-emerald-600" :
                    alertDialog.type === "error" ? "bg-red-500 shadow-red-300 hover:bg-red-600" :
                    alertDialog.type === "warning" ? "bg-amber-500 shadow-amber-300 hover:bg-amber-600" :
                    "bg-sky-500 shadow-sky-300 hover:bg-sky-600"
                  }`}
                >
                  {alertDialog.okText || "OK"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ToastContext.Provider>
  );
}
