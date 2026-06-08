// App logo: a clipboard-check icon on the indigo→violet gradient square.
// Reused in the header and on the login page so they stay in sync.
export function Logo({
  className = "h-7 w-7 rounded-md",
  iconClassName = "h-4 w-4",
}: {
  className?: string;
  iconClassName?: string;
}) {
  return (
    <span
      className={`flex items-center justify-center bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-sm ${className}`}
    >
      <svg
        className={iconClassName}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
        <path d="m9 14 2 2 4-4" />
      </svg>
    </span>
  );
}
