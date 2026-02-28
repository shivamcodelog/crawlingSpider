import { useEffect, useState, useCallback } from "react";
import {
  Search, Filter, UserX, UserCheck, Edit2, Trash2, Plus,
  ChevronLeft, ChevronRight, RefreshCw, Eye, Crown,
} from "lucide-react";
import client from "../../api/client";

const PLAN_BADGE = {
  free: "bg-gray-500/20 text-gray-400",
  starter: "bg-blue-500/20 text-blue-400",
  pro: "bg-orange-500/20 text-orange-400",
  enterprise: "bg-purple-500/20 text-purple-400",
};
const ROLE_BADGE = {
  admin: "bg-red-500/20 text-red-400",
  user: "bg-green-500/20 text-green-400",
};

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface border border-border rounded-xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="font-mono font-semibold text-textPrimary">{title}</h3>
          <button onClick={onClose} className="text-muted hover:text-textPrimary transition-colors text-xl leading-none">&times;</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [creditModal, setCreditModal] = useState(null);
  const [creditAmount, setCreditAmount] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (search) params.set("search", search);
      if (planFilter) params.set("plan", planFilter);
      const res = await client.get(`/api/admin/users?${params}`);
      const d = res.data.data;
      setUsers(d.users);
      setTotal(d.total);
      setPages(d.pages);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [page, search, planFilter]);

  useEffect(() => { load(); }, [load]);

  const handleEdit = (u) => {
    setEditUser(u);
    setEditForm({ role: u.role, plan: u.plan, credits: u.credits, isBanned: u.isBanned });
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      await client.patch(`/api/admin/users/${editUser._id}`, editForm);
      setEditUser(null);
      load();
    } catch (e) { alert("Failed to save."); }
    finally { setSaving(false); }
  };

  const handleDelete = async (u) => {
    if (!confirm(`Delete user "${u.name}" and all their data? This is IRREVERSIBLE.`)) return;
    try {
      await client.delete(`/api/admin/users/${u._id}`);
      load();
    } catch (e) { alert("Failed to delete."); }
  };

  const handleCreditAdjust = async () => {
    try {
      await client.patch(`/api/admin/users/${creditModal._id}`, { creditsAdjust: parseInt(creditAmount) });
      setCreditModal(null);
      setCreditAmount(0);
      load();
    } catch (e) { alert("Failed to adjust."); }
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-textPrimary">Users</h1>
          <p className="text-sm text-muted">{total} total users</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 text-sm text-muted hover:text-textPrimary border border-border rounded-lg px-3 py-2">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 bg-surface border border-border rounded-lg px-3 py-2 flex-1 min-w-52">
          <Search className="w-4 h-4 text-muted flex-shrink-0" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search name or email..."
            className="bg-transparent text-sm text-textPrimary outline-none flex-1 min-w-0 placeholder-muted"
          />
        </div>
        <select
          value={planFilter}
          onChange={(e) => { setPlanFilter(e.target.value); setPage(1); }}
          className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-textPrimary outline-none"
        >
          <option value="">All Plans</option>
          <option value="free">Free</option>
          <option value="starter">Starter</option>
          <option value="pro">Pro</option>
          <option value="enterprise">Enterprise</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-surface border border-border rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {["User", "Plan", "Role", "Credits", "Jobs", "Joined", "Status", "Actions"].map((h) => (
                <th key={h} className="text-left text-xs text-muted font-mono uppercase tracking-wider px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center text-muted py-10 font-mono text-sm">Loading...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={8} className="text-center text-muted py-10 font-mono text-sm">No users found.</td></tr>
            ) : (
              users.map((u) => (
                <tr key={u._id} className="border-b border-border/50 hover:bg-white/2 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      {u.avatar
                        ? <img src={u.avatar} className="w-7 h-7 rounded-full" alt="" />
                        : <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs text-primary font-bold">{u.name?.[0]}</div>
                      }
                      <div>
                        <p className="text-textPrimary font-medium">{u.name}</p>
                        <p className="text-muted text-xs">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded font-mono ${PLAN_BADGE[u.plan] || ""}`}>{u.plan}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded font-mono ${ROLE_BADGE[u.role] || ""}`}>
                      {u.role === "admin" && <Crown className="w-3 h-3 inline mr-1" />}
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-orange-400">{u.credits}</td>
                  <td className="px-4 py-3 text-muted font-mono">{u.jobStats?.total ?? 0} / {u.jobStats?.done ?? 0}</td>
                  <td className="px-4 py-3 text-muted text-xs">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    {u.isBanned
                      ? <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded font-mono">Banned</span>
                      : <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded font-mono">Active</span>
                    }
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => { setCreditModal(u); setCreditAmount(0); }} title="Adjust credits" className="p-1.5 text-muted hover:text-orange-400 transition-colors"><Plus className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleEdit(u)} title="Edit" className="p-1.5 text-muted hover:text-blue-400 transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(u)} title="Delete" className="p-1.5 text-muted hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted">
          <span>Page {page} of {pages}</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-1.5 border border-border rounded disabled:opacity-30 hover:text-textPrimary"><ChevronLeft className="w-4 h-4" /></button>
            <button disabled={page >= pages} onClick={() => setPage(p => p + 1)} className="p-1.5 border border-border rounded disabled:opacity-30 hover:text-textPrimary"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editUser && (
        <Modal title={`Edit — ${editUser.name}`} onClose={() => setEditUser(null)}>
          <div className="space-y-4">
            {[
              { label: "Role", key: "role", type: "select", opts: ["user", "admin"] },
              { label: "Plan", key: "plan", type: "select", opts: ["free", "starter", "pro", "enterprise"] },
              { label: "Credits", key: "credits", type: "number" },
            ].map(({ label, key, type, opts }) => (
              <div key={key}>
                <label className="text-xs text-muted font-mono block mb-1.5">{label}</label>
                {type === "select" ? (
                  <select
                    value={editForm[key]}
                    onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-textPrimary outline-none"
                  >
                    {opts.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input
                    type={type}
                    value={editForm[key]}
                    onChange={e => setEditForm(f => ({ ...f, [key]: type === "number" ? Number(e.target.value) : e.target.value }))}
                    className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-textPrimary outline-none"
                  />
                )}
              </div>
            ))}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={editForm.isBanned}
                onChange={e => setEditForm(f => ({ ...f, isBanned: e.target.checked }))}
                className="w-4 h-4 accent-red-500"
              />
              <span className="text-sm text-red-400 font-mono">Ban this user</span>
            </label>
            <button
              onClick={saveEdit}
              disabled={saving}
              className="w-full bg-primary text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </Modal>
      )}

      {/* Credit Adjust Modal */}
      {creditModal && (
        <Modal title={`Adjust Credits — ${creditModal.name}`} onClose={() => setCreditModal(null)}>
          <div className="space-y-4">
            <p className="text-sm text-muted">Current credits: <span className="text-orange-400 font-mono font-bold">{creditModal.credits}</span></p>
            <div>
              <label className="text-xs text-muted font-mono block mb-1.5">Amount to add (negative to deduct)</label>
              <input
                type="number"
                value={creditAmount}
                onChange={e => setCreditAmount(e.target.value)}
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-textPrimary outline-none"
                placeholder="e.g. 10 or -5"
              />
            </div>
            <button
              onClick={handleCreditAdjust}
              className="w-full bg-orange-500 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-orange-600 transition-colors"
            >
              Apply Adjustment
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
