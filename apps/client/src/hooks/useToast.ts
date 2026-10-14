import { useCallback } from 'react';
import { useAppDispatch } from '../store/hooks';
import {
  addToast,
  defaultToastDuration,
  removeToast,
  type ToastOptions,
  type ToastType,
} from '../store/slices/toastSlice';

export function useToast() {
  const dispatch = useAppDispatch();

  const showToast = useCallback(
    (message: string, type: ToastType = 'success', options?: ToastOptions) => {
      const id = `toast-${Date.now()}-${Math.random()}`;
      const duration = options?.duration;
      const link = options?.link;
      const actionType = options?.actionType;

      dispatch(addToast({ id, message, type, duration, link, actionType }));

      // Errors stay until dismissed unless the caller sets a duration.
      const timeout = typeof duration === 'number' ? duration : defaultToastDuration(type);
      if (timeout !== null) {
        setTimeout(() => dispatch(removeToast(id)), timeout);
      }
    },
    [dispatch]
  );

  return {
    showToast,
    success: useCallback(
      (message: string, options?: ToastOptions) => showToast(message, 'success', options),
      [showToast]
    ),
    error: useCallback((message: string, options?: ToastOptions) => showToast(message, 'error', options), [showToast]),
    warning: useCallback(
      (message: string, options?: ToastOptions) => showToast(message, 'warning', options),
      [showToast]
    ),
    info: useCallback((message: string, options?: ToastOptions) => showToast(message, 'info', options), [showToast]),
  };
}
