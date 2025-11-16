import { useCallback } from 'react';
import { useAppDispatch } from '../store/hooks';
import { addToast, removeToast, type ToastType } from '../store/slices/toastSlice';

export function useToast() {
  const dispatch = useAppDispatch();

  const showToast = useCallback(
    (message: string, type: ToastType = 'success') => {
      const id = `toast-${Date.now()}-${Math.random()}`;
      dispatch(addToast({ id, message, type }));

      // Auto-remove toast after 2 seconds
      setTimeout(() => {
        dispatch(removeToast(id));
      }, 2000);
    },
    [dispatch]
  );

  return {
    showToast,
    success: useCallback((message: string) => showToast(message, 'success'), [showToast]),
    error: useCallback((message: string) => showToast(message, 'error'), [showToast]),
    warning: useCallback((message: string) => showToast(message, 'warning'), [showToast]),
    info: useCallback((message: string) => showToast(message, 'info'), [showToast]),
  };
}
