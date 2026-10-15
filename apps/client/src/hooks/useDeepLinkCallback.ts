/**
 * Hook for managing deep link toast and modal for RPC requests
 *
 * Provides a callback to show the deep link QR code and a cleanup function
 * to dismiss it when the RPC response is received.
 */

import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { selectDeepLinksEnabled, selectDeepLinkToastId } from '../store/slices/deepLinkSlice';
import { clearDeepLinkNotification as clearNotification, showDeepLinkNotification } from '../services/rpcRun';

export function useDeepLinkCallback() {
  const dispatch = useAppDispatch();
  const currentToastId = useAppSelector(selectDeepLinkToastId);
  const deepLinksEnabled = useAppSelector(selectDeepLinksEnabled);

  /**
   * Callback to show the deep link QR code modal
   * Pass this to createRpcHandlers as onDeepLinkAvailable
   * Only shows if deeplinks are enabled in settings
   */
  const onDeepLinkAvailable = useCallback(
    (url: string, title: string) => showDeepLinkNotification(dispatch, deepLinksEnabled, url, title),
    [dispatch, deepLinksEnabled]
  );

  /**
   * Cleanup function to dismiss the deep link modal
   * Call this after RPC response is received (success or error)
   */
  const clearDeepLinkNotification = useCallback(
    () => clearNotification(dispatch, currentToastId),
    [dispatch, currentToastId]
  );

  return {
    onDeepLinkAvailable,
    clearDeepLinkNotification,
  };
}
