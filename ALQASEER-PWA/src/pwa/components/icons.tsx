import React from "react";

type IconProps = React.SVGProps<SVGSVGElement> & {
  size?: number;
};

const base = { fill: "none", stroke: "currentColor", strokeWidth: 1.8 };

function IconBase({ size = 20, children, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} {...props}>
      {children}
    </svg>
  );
}

export const Icons = {
  Home: (props: IconProps) => (
    <IconBase {...props}>
      <path d="M3 10.5L12 3l9 7.5" />
      <path d="M5 10v10h14V10" />
    </IconBase>
  ),
  Route: (props: IconProps) => (
    <IconBase {...props}>
      <path d="M6 5h6a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h9" />
      <circle cx="6" cy="5" r="2" />
      <circle cx="18" cy="17" r="2" />
    </IconBase>
  ),
  MapPin: (props: IconProps) => (
    <IconBase {...props}>
      <path d="M12 21s7-7.3 7-12a7 7 0 1 0-14 0c0 4.7 7 12 7 12z" />
      <circle cx="12" cy="9" r="2.5" />
    </IconBase>
  ),
  Visits: (props: IconProps) => (
    <IconBase {...props}>
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="M8 3v4M16 3v4M7 11h10M7 15h6" />
    </IconBase>
  ),
  User: (props: IconProps) => (
    <IconBase {...props}>
      <circle cx="12" cy="8" r="3" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </IconBase>
  ),
  Bell: (props: IconProps) => (
    <IconBase {...props}>
      <path d="M6 17h12l-1-2v-5a5 5 0 1 0-10 0v5l-1 2z" />
      <path d="M9.5 19a2.5 2.5 0 0 0 5 0" />
    </IconBase>
  ),
  Target: (props: IconProps) => (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="1.5" />
    </IconBase>
  ),
  Sync: (props: IconProps) => (
    <IconBase {...props}>
      <path d="M3 12a9 9 0 0 1 15-6" />
      <path d="M21 12a9 9 0 0 1-15 6" />
      <path d="M18 4v4h-4" />
      <path d="M6 20v-4h4" />
    </IconBase>
  ),
  Accounts: (props: IconProps) => (
    <IconBase {...props}>
      <path d="M4 19v-2a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v2" />
      <circle cx="9" cy="8" r="3" />
      <circle cx="15" cy="8" r="3" />
    </IconBase>
  ),
  Settings: (props: IconProps) => (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1-1.9 3.2-0.2-.1a1.7 1.7 0 0 0-2 .2l-.2.2-3.2-1.9.1-.2a1.7 1.7 0 0 0-1.2-2.6h-.3l-1.6-3.5.3-.1a1.7 1.7 0 0 0 1-2.1l-.1-.3 3.2-1.9.2.2a1.7 1.7 0 0 0 2.2 0l.2-.2 3.2 1.9-.1.3a1.7 1.7 0 0 0 1 2.1l.3.1-1.6 3.5z" />
    </IconBase>
  ),
};
