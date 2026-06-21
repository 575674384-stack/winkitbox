import { type ReactNode } from "react";
import { getPageIcon } from "../core/pageIcons";

export function PageHeaderIcon({
  page,
  className = "",
  alt,
  children,
}: {
  page: string;
  className?: string;
  alt: string;
  children?: ReactNode;
}) {
  const iconUrl = getPageIcon(page);

  return (
    <div className={`command-bar-icon page-mascot-icon ${className}`.trim()}>
      {iconUrl ? <img src={iconUrl} alt={alt} /> : children}
    </div>
  );
}
