import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { removeToast, type Toast } from '../../store/slices/toastSlice';

const toastTypeClasses: Record<NonNullable<Toast['type']>, string> = {
  success: 'alert-success',
  error: 'alert-error',
  warning: 'alert-warning',
  info: 'alert-info',
};

export default function ToastContainer() {
  const toasts = useAppSelector((state) => state.toast.toasts);
  const dispatch = useAppDispatch();

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="toast toast-start toast-bottom z-50 space-y-2">
      {toasts.map((toast) => (
        <div key={toast.id} className={`alert ${toastTypeClasses[toast.type]} flex items-center justify-between`}>
          <div className="flex-1">
            <span>{toast.message}</span>
          </div>

          <button
            type="button"
            aria-label="Dismiss toast"
            className="btn btn-ghost btn-sm ml-2"
            onClick={() => dispatch(removeToast(toast.id))}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
