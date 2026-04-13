const FILL = "#4A90D9";

export function ReedProfileIcon({ size = 22, title }: { size?: number; title?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      role={title ? "img" : "presentation"}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      <path
        d="M7 4C8.5 2 11.5 1.5 14 2.5C16.5 3.5 18 5.5 18.5 8C19 10 18.5 12 17.5 13.5L18 15C18.2 15.5 18 16 17.5 16.2L15.5 16.8C15 18 14 19.5 12.5 20.5C11 21.5 9 22 7.5 21.5C6.5 21.2 6 20.5 6 19.5L6 18C5 17 4.5 15.5 4.5 14C4.5 12 5 10 5.5 8.5C6 7 6.5 5.5 7 4Z"
        fill={FILL}
      />
    </svg>
  );
}
