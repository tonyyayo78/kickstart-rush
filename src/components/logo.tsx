import Image from "next/image";

interface LogoProps {
  variant?: "default" | "on-dark";
  className?: string;
  priority?: boolean;
}

export function Logo({ variant = "default", className, priority = false }: LogoProps) {
  const src =
    variant === "on-dark"
      ? "/kickstart-logo-on-dark.png"
      : "/kickstart-logo.png";

  return (
    <Image
      src={src}
      alt="Kickstart Football Club Barbados"
      width={940}
      height={227}
      priority={priority}
      unoptimized
      className={["w-auto", className].filter(Boolean).join(" ")}
    />
  );
}
