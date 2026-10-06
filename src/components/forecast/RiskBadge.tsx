import type { RiskLevel } from "../../types/forecast";

const STYLES: Record<RiskLevel, string> = {
  LOW: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  MEDIUM: "bg-amber-50 text-amber-700 border border-amber-200",
  HIGH: "bg-orange-50 text-orange-700 border border-orange-200",
  CRITICAL: "bg-red-50 text-red-700 border border-red-200",
};

const LABELS: Record<RiskLevel, string> = {
  LOW: "Low Risk",
  MEDIUM: "Medium Risk",
  HIGH: "High Risk",
  CRITICAL: "Critical",
};

interface Props {
  level: RiskLevel;
}

function RiskBadge({ level }: Props) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
        STYLES[level] ?? STYLES.MEDIUM
      }`}
    >
      {LABELS[level] ?? level}
    </span>
  );
}

export default RiskBadge;