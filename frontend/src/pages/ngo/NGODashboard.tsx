import { useAuth } from "../../context/AuthContext";

export default function NGODashboard() {
  const { user } = useAuth();

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">
          NGO Dashboard
        </h1>

        <p className="mt-2 text-gray-600">
          Welcome{user?.full_name ? `, ${user.full_name}` : ""}.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="text-lg font-semibold">
            Requirements
          </h2>

          <p className="mt-2 text-gray-500">
            Manage your food requirements.
          </p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="text-lg font-semibold">
            Incoming Donations
          </h2>

          <p className="mt-2 text-gray-500">
            View incoming donation information.
          </p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="text-lg font-semibold">
            Pickup History
          </h2>

          <p className="mt-2 text-gray-500">
            View your previous pickup activity.
          </p>
        </div>
      </div>
    </div>
  );
}