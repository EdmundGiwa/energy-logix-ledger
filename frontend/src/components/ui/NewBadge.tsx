/** Tag for recently added modules. Remove a module's `isNew` flag once it is no longer new. */
export function NewBadge({ size = "sm", className = "" }: { size?: "xs" | "sm" | "md"; className?: string }) {
  const sz = {
    xs: "h-4 gap-0.5 px-1.5 text-[9px]",
    sm: "h-5 gap-1 px-2 text-[10px]",
    md: "h-6 gap-1 px-2.5 text-[11px]",
  }[size];
  const icon = size === "md" ? 11 : size === "sm" ? 10 : 8;
  return (
    <span className={`new-badge inline-flex shrink-0 items-center rounded-full font-bold uppercase tracking-[0.12em] text-white ${sz} ${className}`}>
      <svg width={icon} height={icon} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 2l2.2 6.3L20.5 10l-6.3 2.2L12 18.5l-2.2-6.3L3.5 10l6.3-1.7z" />
        <path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z" opacity=".75" />
      </svg>
      New
    </span>
  );
}

/** Compact marker for icon-only spots. Pass `absolute` (with offsets) or `relative` in className. */
export function NewDot({ className = "" }: { className?: string }) {
  return <span aria-hidden className={`new-dot h-2 w-2 shrink-0 rounded-full ${className}`} />;
}
