export const STICKY_HEADER_OFFSET_PX = 88;

export function scrollToHash(hash: string, offsetPx: number = STICKY_HEADER_OFFSET_PX): boolean {
  if (!hash || hash === "#") return false;

  const id = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!id) return false;

  const target = document.getElementById(id);
  if (!target) return false;

  const targetTop = target.getBoundingClientRect().top + window.scrollY - offsetPx;
  window.scrollTo({
    top: Math.max(0, targetTop),
    behavior: "smooth",
  });

  return true;
}
