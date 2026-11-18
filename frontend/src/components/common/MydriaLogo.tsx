interface MydriaLogoProps {
  className?: string;
}

/**
 * Monogram geometris 'M' bertitik fokus retina (Opsi B: Bauhaus Lens Cradle).
 * Warna mengikuti token aktif (`currentColor` dan `--accent-signal`).
 */
export function MydriaLogo({ className = "h-6 w-6" }: MydriaLogoProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      width="24"
      height="24"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M10 12H23V23A9 9 0 0 0 41 23V12H54V52H45V35.45A18 18 0 0 1 19 35.45V52H10Z"
      />
      <circle cx="32" cy="23" r="5.5" fill="var(--accent-signal)" />
    </svg>
  );
}
