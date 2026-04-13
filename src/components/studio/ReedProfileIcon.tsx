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
        d="M8 3.5C10 3 13 3.5 14.5 5.5C15.5 7 15.5 8.5 15 10L16.5 11C17 11.5 17 12.5 16.5 13L15 13.5C15 15 14 16 12.5 16.5L13 18C16 18.5 19.5 19.5 20.5 20.5C21 21 21 21.5 21 22L3 22C3 21.5 3 21 3.5 20.5C4.5 19.5 8 18.5 11 18L11.5 16.5C10 16 9 15 8.5 13.5C7.5 13 7 12 7.5 11C7 9.5 6.5 7 7.5 5C7.8 4.3 8 3.8 8 3.5Z"
        fill={FILL}
      />
    </svg>
  );
}
