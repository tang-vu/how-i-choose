export function BrandMark({ size = 40 }: { size?: number }) {
  return (
    <svg
      aria-hidden="true"
      className="brand-mark"
      height={size}
      viewBox="0 0 48 48"
      width={size}
    >
      <path d="M7 12h19a7 7 0 0 1 0 14H18l-6 6v-6H7a7 7 0 0 1 0-14Z" />
      <circle cx="36" cy="34" r="7" />
      <path className="brand-stop" d="M33 31h6v6h-6z" />
    </svg>
  );
}
