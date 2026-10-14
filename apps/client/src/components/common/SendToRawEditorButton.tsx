/**
 * Opens the Raw RPC editor with a request ({ method, params }) filled in.
 */

import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { MdEditNote } from 'react-icons/md';
import type { AppDispatch } from '../../store';
import { navigateToRawRpcEditor } from '../../store/slices/navigationSlice';
import { getStageUrl } from '../../config/stageRoutes';
import { safeStringify } from '../../utils/betHelpers';

interface SendToRawEditorButtonProps {
  request: { method: string; params?: unknown };
  disabled?: boolean;
}

export default function SendToRawEditorButton({ request, disabled = false }: SendToRawEditorButtonProps) {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const handleClick = () => {
    dispatch(navigateToRawRpcEditor({ requestJson: safeStringify(request, 2) }));
    navigate(getStageUrl('rpc-raw-editor'));
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className="btn btn-ghost"
      title="Open this request in the Raw RPC editor"
    >
      <MdEditNote aria-hidden="true" />
      Edit raw
    </button>
  );
}
