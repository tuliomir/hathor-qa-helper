import { MdCheckCircleOutline, MdClose, MdErrorOutline, MdInfoOutline, MdWarningAmber } from 'react-icons/md';
import type React from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { removeToast, type Toast, type ToastActionType } from '../../store/slices/toastSlice';
import { showDeepLinkModal } from '../../store/slices/deepLinkSlice';

/** Toast tones share the Callout palette. */
const TONE: Record<Toast['type'], { box: string; icon: string; Icon: React.ComponentType<{ className?: string }> }> = {
  success: { box: 'bg-tint-success', icon: 'text-success', Icon: MdCheckCircleOutline },
  error: { box: 'bg-tint-error', icon: 'text-error', Icon: MdErrorOutline },
  warning: { box: 'bg-tint-warning', icon: 'text-warning-ink', Icon: MdWarningAmber },
  info: { box: 'bg-tint-info', icon: 'text-info', Icon: MdInfoOutline },
};

const MAX_VISIBLE = 3;

// Map of action types to their corresponding Redux actions
const actionHandlers: Record<ToastActionType, () => ReturnType<typeof showDeepLinkModal>> = {
  showDeepLinkModal: () => showDeepLinkModal(),
};

export default function ToastContainer() {
  const toasts = useAppSelector((state) => state.toast.toasts);
  const dispatch = useAppDispatch();

  const handleToastClick = (toast: Toast) => {
    if (toast.actionType) {
      const action = actionHandlers[toast.actionType];
      if (action) {
        dispatch(action());
        dispatch(removeToast(toast.id));
      }
    }
  };

  if (toasts.length === 0) {
    return null;
  }

  // Newest at the bottom; older ones beyond the limit collapse into a counter.
  const visible = toasts.slice(-MAX_VISIBLE);
  const hidden = toasts.length - visible.length;

  return (
    <div className="toast toast-end toast-bottom z-50 w-[min(24rem,calc(100vw-2rem))] gap-2 p-4">
      {hidden > 0 && (
        <button
          type="button"
          className="self-end rounded-full bg-base-100 px-2.5 py-0.5 text-caption text-ink-muted shadow-float"
          onClick={() => toasts.slice(0, hidden).forEach((t) => dispatch(removeToast(t.id)))}
          title="Dismiss older notifications"
        >
          +{hidden} more
        </button>
      )}
      {visible.map((toast) => {
        const { box, icon, Icon } = TONE[toast.type];
        const urgent = toast.type === 'error' || toast.type === 'warning';
        return (
          <div
            key={toast.id}
            role={urgent ? 'alert' : 'status'}
            aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
            className={`flex items-start gap-2.5 rounded-box border border-base-300 px-3 py-2.5 text-left text-body text-base-content shadow-float whitespace-normal ${box}`}
          >
            <Icon className={`mt-0.5 h-4 w-4 flex-none ${icon}`} aria-hidden="true" />
            <div
              className={`min-w-0 flex-1 break-words ${toast.actionType ? 'cursor-pointer underline-offset-2 hover:underline' : ''}`}
              onClick={toast.actionType ? () => handleToastClick(toast) : undefined}
              role={toast.actionType ? 'button' : undefined}
              tabIndex={toast.actionType ? 0 : undefined}
              onKeyDown={toast.actionType ? (e) => e.key === 'Enter' && handleToastClick(toast) : undefined}
            >
              {toast.message}
              {toast.link && (
                <>
                  {' '}
                  <a
                    href={toast.link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="link link-primary"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {toast.link.label}
                  </a>
                </>
              )}
            </div>
            <button
              type="button"
              aria-label="Dismiss notification"
              className="btn btn-ghost btn-xs btn-square -mr-1 -mt-0.5"
              onClick={(e) => {
                e.stopPropagation();
                dispatch(removeToast(toast.id));
              }}
            >
              <MdClose aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
