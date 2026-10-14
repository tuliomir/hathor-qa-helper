import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { removeToast, type Toast, type ToastActionType } from '../../store/slices/toastSlice';
import { showDeepLinkModal } from '../../store/slices/deepLinkSlice';

const toastTypeClasses: Record<NonNullable<Toast['type']>, string> = {
  success: 'alert-success',
  error: 'alert-error',
  warning: 'alert-warning',
  info: 'alert-info',
};

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

  return (
    <div className="toast toast-start toast-bottom z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`alert ${toastTypeClasses[toast.type]} flex items-center justify-between ${toast.actionType ? 'cursor-pointer hover:opacity-90' : ''}`}
          onClick={toast.actionType ? () => handleToastClick(toast) : undefined}
          role={toast.actionType ? 'button' : undefined}
          tabIndex={toast.actionType ? 0 : undefined}
          onKeyDown={toast.actionType ? (e) => e.key === 'Enter' && handleToastClick(toast) : undefined}
        >
          <div className="flex-1">
            <span>
              {toast.message}
              {toast.link && (
                <>
                  {' '}
                  <a
                    href={toast.link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="underline text-primary"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {toast.link.label}
                  </a>
                </>
              )}
            </span>
          </div>

          <button
            type="button"
            aria-label="Dismiss toast"
            className="btn btn-ghost btn-sm ml-2"
            onClick={(e) => {
              e.stopPropagation();
              dispatch(removeToast(toast.id));
            }}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
