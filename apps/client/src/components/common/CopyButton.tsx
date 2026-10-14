import { MdContentCopy } from 'react-icons/md';
import { useToast } from '../../hooks/useToast';

interface CopyButtonProps {
  text: string;
  label?: string;
  className?: string;
}

export default function CopyButton({ text, label = 'Copy', className = '' }: CopyButtonProps) {
  const { success, error } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      const truncatedText = text.length > 20 ? `${text.substring(0, 20)}...` : text;
      success(`Copied: ${truncatedText}`);
    } catch (err) {
      console.error('Failed to copy:', err);
      error('Failed to copy to clipboard');
    }
  };

  return (
    <button
      onClick={handleCopy}
      title={label}
      className={`p-0 bg-transparent border-0 inline-flex items-center cursor-pointer ${className}`}
      aria-label={label}
    >
      <MdContentCopy />
    </button>
  );
}
