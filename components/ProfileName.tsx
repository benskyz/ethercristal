"use client";

import { EtherFX } from "@/components/effects/EtherFX";

interface ProfileNameProps {
  name: string;
  effectClass?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  animate?: boolean;
  className?: string;
}

const SIZE: Record<NonNullable<ProfileNameProps["size"]>, string> = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-xl",
  xl: "text-3xl",
};

export function ProfileName({
  name,
  effectClass,
  size = "md",
  animate = true,
  className = "",
}: ProfileNameProps) {
  if (!effectClass) {
    return (
      <span
        aria-label={name}
        className={[
          "whitespace-nowrap font-bold tracking-wide text-white",
          SIZE[size],
          className,
        ].join(" ")}
      >
        {name}
      </span>
    );
  }

  return (
    <EtherFX
      effectClass={effectClass}
      name={name}
      active={animate}
      size={size}
      className={className}
    />
  );
}

export default ProfileName;
