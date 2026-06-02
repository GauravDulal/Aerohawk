'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'default';

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('');
  const [type, setType] = useState<ToastType>('default');
  const [visible, setVisible] = useState(false);

  const showToast = useCallback((msg: string, t: ToastType = 'success') => {
    setMessage(msg);
    setType(t);
    setVisible(true);
    setTimeout(() => setVisible(false), 3200);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className={`toast ${visible ? 'show' : ''} ${type}`}>
        {message}
      </div>
    </ToastContext.Provider>
  );
}
