/**
 * Keyboard model of SegmentedControl (a radiogroup with roving focus):
 * arrows and Home/End move focus over enabled options, wrapping around;
 * Space and Enter select the focused option.
 */

export type SegmentedKeyResult = { focus: number } | { select: number } | null;

export function segmentedKeyDown(
  options: ReadonlyArray<{ disabled?: boolean }>,
  focusedIndex: number,
  key: string
): SegmentedKeyResult {
  const enabled = options.map((o, i) => (o.disabled ? -1 : i)).filter((i) => i >= 0);

  if (key === ' ' || key === 'Enter') {
    return options[focusedIndex] && !options[focusedIndex].disabled ? { select: focusedIndex } : null;
  }
  if (enabled.length === 0) return null;

  switch (key) {
    case 'Home':
      return { focus: enabled[0] };
    case 'End':
      return { focus: enabled[enabled.length - 1] };
    case 'ArrowRight':
    case 'ArrowDown':
    case 'ArrowLeft':
    case 'ArrowUp': {
      const step = key === 'ArrowRight' || key === 'ArrowDown' ? 1 : -1;
      const n = options.length;
      for (let k = 1; k <= n; k++) {
        const i = (((focusedIndex + step * k) % n) + n) % n;
        if (!options[i].disabled) return { focus: i };
      }
      return null;
    }
    default:
      return null;
  }
}
