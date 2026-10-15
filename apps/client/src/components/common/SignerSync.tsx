import { useSignerSync } from '../../hooks/useSignerSync';

/** Invisible: starts and stops signers on the QA server with their wallets. */
export default function SignerSync() {
  useSignerSync();
  return null;
}
