import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

const ToastContext = createContext(null);
let idCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const hide = useCallback((id) => {
    // Mark as not visible so the component can animate out, then remove
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, visible: false } : t)));
    // Duration should match CSS out animation (250ms)
    setTimeout(() => remove(id), 260);
  }, [remove]);

  const show = useCallback((toast) => {
    const id = ++idCounter;
    const item = { id, duration: 3000, type: 'info', visible: true, ...toast };
    setToasts((prev) => [...prev, item]);
    if (item.duration > 0) {
      setTimeout(() => hide(id), item.duration);
    }
    return id;
  }, [hide]);

  const api = useMemo(() => ({
    show,
    remove,
    hide,
    success: (msg, opts={}) => show({ type: 'success', message: msg, ...opts }),
    error: (msg, opts={}) => show({ type: 'error', message: msg, ...opts }),
    info: (msg, opts={}) => show({ type: 'info', message: msg, ...opts }),
    warning: (msg, opts={}) => show({ type: 'warning', message: msg, ...opts }),
  }), [show, remove]);

  return (
    <ToastContext.Provider value={{ toasts, ...api }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
