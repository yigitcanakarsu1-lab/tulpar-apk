import React from "react";

interface TulparLogoProps {
  className?: string;
  size?: number;
  variant?: "black" | "white" | "badge" | "card";
}

/**
 * Official Tulpar Winged Horse (Pegasus) emblem.
 * Renders the exact rearing winged horse silhouette in vector fidelity.
 */
export const TulparLogo: React.FC<TulparLogoProps> = ({
  className = "",
  size = 32,
  variant = "black",
}) => {
  if (variant === "white") {
    return (
      <img
        src="tulpar_white.png"
        alt="Tulpar Amblemi"
        width={size}
        height={size}
        className={`inline-block object-contain select-none shrink-0 ${className}`}
        referrerPolicy="no-referrer"
        loading="eager"
      />
    );
  }

  if (variant === "card") {
    return (
      <div
        style={{ width: size, height: size }}
        className={`inline-flex items-center justify-center rounded-2xl bg-white p-1.5 shadow-sm border border-neutral-200/80 overflow-hidden select-none shrink-0 ${className}`}
      >
        <img
          src="tulpar_transparent.png"
          alt="Tulpar Amblemi"
          className="h-full w-full object-contain"
          referrerPolicy="no-referrer"
          loading="eager"
        />
      </div>
    );
  }

  if (variant === "badge") {
    return (
      <div
        style={{ width: size, height: size }}
        className={`inline-flex items-center justify-center rounded-full bg-neutral-900 p-1 shadow-xs overflow-hidden select-none shrink-0 ${className}`}
      >
        <img
          src="tulpar_white.png"
          alt="Tulpar Amblemi"
          className="h-full w-full object-contain"
          referrerPolicy="no-referrer"
          loading="eager"
        />
      </div>
    );
  }

  // Default: Direct crisp black rearing Tulpar horse on transparent background
  return (
    <img
      src="tulpar_transparent.png"
      alt="Tulpar Amblemi"
      width={size}
      height={size}
      className={`inline-block object-contain select-none shrink-0 ${className}`}
      referrerPolicy="no-referrer"
      loading="eager"
    />
  );
};
