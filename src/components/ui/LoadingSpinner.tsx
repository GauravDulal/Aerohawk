'use client';

export default function LoadingSpinner({ size = 'md', label = 'Loading...' }: { size?: 'sm' | 'md' | 'lg'; label?: string }) {
  const sizeMap = { sm: 20, md: 32, lg: 48 };
  const dim = sizeMap[size];

  return (
    <div className="loading-spinner-wrap" role="status" aria-label={label}>
      <svg
        className="loading-spinner"
        width={dim}
        height={dim}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="12" cy="12" r="10" stroke="var(--border)" strokeWidth="3" />
        <path
          d="M12 2a10 10 0 0 1 10 10"
          stroke="var(--navy)"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      <span className="sr-only">{label}</span>
    </div>
  );
}
