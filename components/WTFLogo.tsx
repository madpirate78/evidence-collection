// components/WTFLogo.tsx

// Define the interface for the component props
interface WTFLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  layout?: "horizontal" | "stacked";
  showTagline?: boolean;
  className?: string;
}

export function WTFLogo({
  size = "md",
  layout = "horizontal",
  showTagline = true,
  className = "",
}: WTFLogoProps) {
  const sizes: Record<
    "sm" | "md" | "lg" | "xl",
    { logo: string; tagline: string }
  > = {
    sm: { logo: "text-2xl", tagline: "text-xs" },
    md: { logo: "text-4xl", tagline: "text-sm" },
    lg: { logo: "text-6xl", tagline: "text-base" },
    xl: { logo: "text-7xl", tagline: "text-lg" },
  };

  const { logo: logoSize, tagline: taglineSize } = sizes[size];

  if (layout === "horizontal") {
    return (
      <div className={`inline-flex items-center gap-3 ${className}`}>
        <span
          className={`font-[var(--font-oswald)] font-bold ${logoSize} text-[#FF6B35] tracking-tight uppercase`}
        >
          W<span className="text-slate-400">?</span>F
        </span>
        {showTagline && (
          <span
            className={`${taglineSize} text-slate-400 dark:text-slate-300 font-medium uppercase tracking-wider`}
          >
            Working Towards Fairness
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`text-center ${className}`}>
      <div
        className={`font-[var(--font-oswald)] font-bold ${logoSize} text-[#FF6B35] tracking-tight leading-none uppercase`}
      >
        W<span className="text-slate-400">?</span>F
      </div>
      {showTagline && (
        <div
          className={`${taglineSize} text-slate-400 dark:text-slate-300 uppercase tracking-wider mt-1`}
        >
          Working Towards Fairness
        </div>
      )}
    </div>
  );
}
