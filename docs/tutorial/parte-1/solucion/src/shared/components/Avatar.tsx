interface AvatarProps {
  initials: string;
  size?: 'sm' | 'md';
}

/** Círculo con las iniciales de una persona. */
export function Avatar({ initials, size = 'md' }: AvatarProps) {
  return <span className={`avatar avatar--${size}`}>{initials}</span>;
}
