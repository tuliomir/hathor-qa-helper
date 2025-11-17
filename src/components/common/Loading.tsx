interface LoadingProps {
  message?: string;
  overlay?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export default function Loading({
  message = 'Loading...',
  overlay = false,
  size = 'medium'
}: LoadingProps) {
  const sizeClasses = {
    small: 'w-6 h-6 border-2',
    medium: 'w-12 h-12 border-3',
    large: 'w-16 h-16 border-4',
  };

  const spinner = (
    <div className="flex flex-col items-center justify-center gap-3">
      <div
        className={`${sizeClasses[size]} border-primary border-t-transparent rounded-full animate-spin`}
        role="status"
        aria-label="Loading"
      />
      {message && <p className="text-muted m-0">{message}</p>}
    </div>
  );

  if (overlay) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="card-primary">
          {spinner}
        </div>
      </div>
    );
  }

  return spinner;
}
