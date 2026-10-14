/**
 * Class strings for the shielded "veil" (accent + 45° hatch). Kept as
 * literals so Tailwind sees them.
 */

/** Solid accent strip with light hatching: row edges, callout edges. */
export const VEIL_STRIP =
  'bg-accent [background-image:repeating-linear-gradient(135deg,rgb(255_255_255/0.38)_0_2px,transparent_2px_6px)]';

/** Hatched tint for hidden-amount pills and shielded network dots. */
export const VEIL_FILL = 'bg-tint-shielded bg-veil';
