interface BrandEmblemProps {
  size?: number;
  className?: string;
}

export function BrandEmblem({ size = 36, className = '' }: BrandEmblemProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      <rect
        x="4"
        y="7"
        width="26"
        height="28"
        rx="4"
        transform="rotate(-6 4 7)"
        fill="#1E293B"
        stroke="#475569"
        strokeWidth="1.5"
      />
      <rect
        x="9"
        y="6"
        width="26"
        height="28"
        rx="4"
        fill="#131B2E"
        stroke="#F59E0B"
        strokeWidth="1.75"
      />
      <path
        d="M15 15H29M15 20.5H25M15 26H21"
        stroke="#F8FAFC"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="29" cy="26" r="2.25" fill="#F59E0B" />
    </svg>
  );
}
