import AdminAccountStatusPage from "./AdminAccountStatusPage";

export default function RejectedAccounts() {
  return (
    <AdminAccountStatusPage
      status="REJECTED"
      title="Rejected Accounts"
      description="Review organization registrations that were not approved by the platform administrator."
      accent="red"
    />
  );
}