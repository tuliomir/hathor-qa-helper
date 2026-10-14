/**
 * useConfirm — promise-based ConfirmDialog, a drop-in for `window.confirm`:
 *
 *   const { confirm, confirmDialog } = useConfirm();
 *   if (await confirm({ title, confirmLabel: 'Remove wallet', tone: 'danger' })) { … }
 *   return <>{…}{confirmDialog}</>;
 */

import { useCallback, useRef, useState } from 'react';
import { ConfirmDialog, type ConfirmDialogProps } from '../components/ui/ConfirmDialog';

export type ConfirmOptions = Omit<ConfirmDialogProps, 'open' | 'onConfirm' | 'onCancel'>;

export function useConfirm() {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  const settle = useCallback((ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = null;
    setOptions(null);
  }, []);

  const confirm = useCallback((opts: ConfirmOptions) => {
    resolver.current?.(false);
    setOptions(opts);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const confirmDialog = (
    <ConfirmDialog
      title=""
      confirmLabel="Confirm"
      {...options}
      open={options !== null}
      onConfirm={() => settle(true)}
      onCancel={() => settle(false)}
    />
  );

  return { confirm, confirmDialog };
}
