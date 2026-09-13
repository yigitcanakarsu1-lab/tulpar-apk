import React from "react";

interface OpenAILogoProps {
  className?: string;
  size?: number;
}

export const OpenAILogo: React.FC<OpenAILogoProps> = ({
  className = "text-black",
  size = 32,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="AI Logo"
    >
      {/* Sleek geometric spiral emblem inspired by modern minimalist AI branding */}
      <circle cx="50" cy="50" r="46" fill="currentColor" />
      <g stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M50 20 C66 20, 78 32, 78 48 C78 60, 68 70, 56 70" />
        <path d="M76 35 C84 49, 80 66, 66 74 C55 80, 42 76, 36 65" />
        <path d="M76 65 C68 79, 52 84, 38 78 C27 73, 22 61, 28 49" />
        <path d="M50 80 C34 80, 22 68, 22 52 C22 40, 32 30, 44 30" />
        <path d="M24 65 C16 51, 20 34, 34 26 C45 20, 58 24, 64 35" />
        <path d="M24 35 C32 21, 48 16, 62 22 C73 27, 78 39, 72 51" />
      </g>
      <circle cx="50" cy="50" r="6" fill="white" />
    </svg>
  );
};
