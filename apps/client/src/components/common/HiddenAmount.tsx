/**
 * HiddenAmount — the hatched "hidden" pill for a shielded value nobody here
 * could decrypt. Never show hidden values as 0, a dash or an empty cell.
 */

import { VEIL_FILL } from '../ui/veil';

export function HiddenAmount({ title = 'Hidden. A wallet with View capability can decrypt it.' }: { title?: string }) {
  return (
    <span
      title={title}
      className={`inline-flex h-5 items-center rounded-full px-2 font-sans text-caption font-semibold text-accent ${VEIL_FILL}`}
    >
      hidden
    </span>
  );
}

export default HiddenAmount;
