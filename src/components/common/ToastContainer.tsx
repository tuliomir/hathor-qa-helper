import { useAppSelector } from '../../store/hooks';
import type { ToastType } from '../../store/slices/toastSlice';

const toastTypeClasses: Record<ToastType, string> = {
  success: 'alert-success',
  error: 'alert-error',
  warning: 'alert-warning',
  info: 'alert-info',
};

export default function ToastContainer() {
  const toasts = useAppSelector((state) => state.toast.toasts);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="toast toast-start toast-bottom z-50">
      {toasts.map((toast) => (
        <div key={toast.id} className={`alert ${toastTypeClasses[toast.type]}`}>
          <span>{toast.message}</span>
        </div>
      ))}
    </div>
  );
}
