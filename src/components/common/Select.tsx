/**
 * Select Component
 * Reusable select dropdown with chevron icon
 */

import { MdKeyboardArrowDown } from 'react-icons/md';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  children: React.ReactNode;
  className?: string;
}

export default function Select({ children, className = '', ...props }: SelectProps) {
  return (
    <div className="relative">
      <select
        {...props}
        className={`input cursor-pointer bg-white pr-10 ${className}`}
      >
        {children}
      </select>
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-600">
        <MdKeyboardArrowDown className="text-xl" />
      </div>
    </div>
  );
}
