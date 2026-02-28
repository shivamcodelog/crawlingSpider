import AdminSidebar from "../../components/admin/AdminSidebar";
import { Outlet } from "react-router-dom";

export default function AdminLayout() {
  return (
    <div className="flex min-h-screen bg-bg text-textPrimary">
      <AdminSidebar />
      <main className="ml-64 flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
