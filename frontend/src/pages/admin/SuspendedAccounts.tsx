import AdminAccountStatusPage from "./AdminAccountStatusPage";

export default function SuspendedAccounts() {
  return (
    <AdminAccountStatusPage
      status="SUSPENDED"
      title="Suspended Accounts"
      description="Review organizations that have temporarily lost access to the FwdNourish platform."
      accent="orange"
    />
  );
}