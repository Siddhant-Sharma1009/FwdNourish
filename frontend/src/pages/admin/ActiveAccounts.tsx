import AdminAccountStatusPage from "./AdminAccountStatusPage";

export default function ActiveAccounts() {
  return (
    <AdminAccountStatusPage
      status="ACTIVE"
      title="Active Accounts"
      description="View all approved businesses and NGOs currently operating on FwdNourish."
      accent="emerald"
    />
  );
}