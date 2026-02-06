/**
 * Send to Raw Editor Button Component
 *
 * A small button that sends request JSON to the Raw RPC Editor stage
 */

import React from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { AppDispatch } from '../../store';
import { navigateToRawRpcEditor } from '../../store/slices/navigationSlice';
import { getStageUrl } from '../../config/stageRoutes';
import { useToast } from '../../hooks/useToast';

interface SendToRawEditorButtonProps {
  requestJson: string;
  disabled?: boolean;
}

const SendToRawEditorButton: React.FC<SendToRawEditorButtonProps> = ({
  requestJson,
  disabled = false,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const handleClick = () => {
    try {
      // Format the JSON nicely
      const parsed = JSON.parse(requestJson);
      const formatted = JSON.stringify(parsed, null, 2);

      // Set the navigation data
      dispatch(navigateToRawRpcEditor({ requestJson: formatted }));

      // Navigate to the raw editor stage
      navigate(getStageUrl('rpc-raw-editor'));
    } catch (e) {
      showToast('Failed to send to raw editor', 'error');
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className="text-xs text-muted hover:text-primary flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
      title="Send to Raw RPC Editor"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-3.5 w-3.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
        />
      </svg>
      <span>Raw Editor</span>
    </button>
  );
};

export default SendToRawEditorButton;
