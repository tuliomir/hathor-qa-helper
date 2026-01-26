/**
 * Hook for managing deep link toast and modal for RPC requests
 *
 * Provides a callback to show the deep link QR code and a cleanup function
 * to dismiss it when the RPC response is received.
 */

import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
	clearDeepLink,
	selectDeepLinksEnabled,
	selectDeepLinkToastId,
	setDeepLink,
	showDeepLinkModal,
} from '../store/slices/deepLinkSlice';
import { addToast, removeToast } from '../store/slices/toastSlice';

const DEEP_LINK_TOAST_DURATION = 3000; // 3 seconds

export function useDeepLinkCallback() {
  const dispatch = useAppDispatch();
  const currentToastId = useAppSelector(selectDeepLinkToastId);
  const deepLinksEnabled = useAppSelector(selectDeepLinksEnabled);

  /**
   * Callback to show the deep link QR code modal and toast
   * Pass this to createRpcHandlers as onDeepLinkAvailable
   * Only shows if deeplinks are enabled in settings
   */
  const onDeepLinkAvailable = useCallback(
    (url: string, title: string) => {
      // Skip if deeplinks are disabled
      if (!deepLinksEnabled) {
        return;
      }

      const toastId = `deeplink-toast-${Date.now()}`;

      dispatch(setDeepLink({ url, title, toastId }));
      dispatch(showDeepLinkModal());
      dispatch(
        addToast({
          id: toastId,
          message: 'Deep link available. Click to show QR code.',
          type: 'info',
          duration: DEEP_LINK_TOAST_DURATION,
          actionType: 'showDeepLinkModal',
        })
      );
    },
    [dispatch, deepLinksEnabled]
  );

  /**
   * Cleanup function to dismiss the deep link toast and modal
   * Call this after RPC response is received (success or error)
   */
  const clearDeepLinkNotification = useCallback(() => {
    if (currentToastId) {
      dispatch(removeToast(currentToastId));
    }
    dispatch(clearDeepLink());
  }, [dispatch, currentToastId]);

  return {
    onDeepLinkAvailable,
    clearDeepLinkNotification,
  };
}
