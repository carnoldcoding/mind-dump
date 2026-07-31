// Single seam for the VITE_DISABLE_ANIMATIONS dev flag — panels/windows/modals route through here rather than each checking the env var themselves.
export const animationsDisabled = (): boolean =>
  import.meta.env.VITE_DISABLE_ANIMATIONS === 'true';

export const enterClass = (className: string): string =>
  animationsDisabled() ? '' : className;
