import type { ExpiryStatus } from "../../types/expiry";


interface ExpiryBadgeProps {
  status: ExpiryStatus["status"];
}


function ExpiryBadge({
  status,
}: ExpiryBadgeProps) {

  const styles = {
    SAFE: "bg-green-100 text-green-700",
    CRITICAL: "bg-orange-100 text-orange-700",
    EXPIRED: "bg-red-100 text-red-700",
  };


  const labels = {
    SAFE: "Safe",
    CRITICAL: "Critical",
    EXPIRED: "Expired",
  };


  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}


export default ExpiryBadge;