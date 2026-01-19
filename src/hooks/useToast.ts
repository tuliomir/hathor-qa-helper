import { useCallback } from 'react';
import { useAppDispatch } from '../store/hooks';
import { addToast, removeToast, type ToastOptions, type ToastType } from '../store/slices/toastSlice';

export function useToast() {
  const dispatch = useAppDispatch();

  const showToast = useCallback(
    (message: string, type: ToastType = 'success', options?: ToastOptions) => {
      const id = `toast-${Date.now()}-${Math.random()}`;
      const duration = options?.duration;
      const link = options?.link;

      dispatch(addToast({ id, message, type, duration, link }));

      // Auto-remove toast after duration or default 2000ms
      setTimeout(() => {
        dispatch(removeToast(id));
      }, typeof duration === 'number' ? duration : 2000);
    },
    [dispatch]
  );

  return {
    showToast,
    success: useCallback((message: string, options?: ToastOptions) => showToast(message, 'success', options), [showToast]),
    error: useCallback((message: string, options?: ToastOptions) => showToast(message, 'error', options), [showToast]),
    warning: useCallback((message: string, options?: ToastOptions) => showToast(message, 'warning', options), [showToast]),
    info: useCallback((message: string, options?: ToastOptions) => showToast(message, 'info', options), [showToast]),
  };
}
