import AdminAccountStatusPage from "./AdminAccountStatusPage";

export default function PendingAccounts() {
  return (
    <AdminAccountStatusPage
      status="PENDING"
      title="Pending Verification"
      description="Review businesses and NGOs that are waiting for administrative verification."
      accent="amber"
    />
  );
}