import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Users, FileText, CreditCard, Settings, BarChart3, 
  ArrowLeft, Shield, Palette, ToggleLeft, ToggleRight,
  Trash2, ChevronDown, ChevronUp, Crown, Ban, CheckCircle, Search,
  DollarSign, Download, TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { xhrGet, xhrPut, xhrPost, xhrDelete, BACKEND_URL } from "@/lib/xhr";

export default function AdminPortal() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [settings, setSettings] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (currentUser) {
      if (activeTab === "overview") fetchStats();
      if (activeTab === "users") fetchUsers();
      if (activeTab === "transactions") fetchTransactions();
      if (activeTab === "settings") fetchSettings();
    }
  }, [activeTab, currentUser]);

  const checkAdminAccess = async () => {
    try {
      const result = await xhrGet(`${BACKEND_URL}/api/auth/me`);
      if (!result.ok || !result.data?.is_owner) {
        toast.error("Admin access required");
        navigate("/dashboard");
        return;
      }
      setCurrentUser(result.data);
      setLoading(false);
    } catch {
      navigate("/login");
    }
  };

  const fetchStats = async () => {
    const result = await xhrGet(`${BACKEND_URL}/api/admin/stats`);
    if (result.ok) setStats(result.data);
  };

  const fetchUsers = async () => {
    const result = await xhrGet(`${BACKEND_URL}/api/admin/users`);
    if (result.ok) setUsers(result.data);
  };

  const fetchTransactions = async () => {
    const result = await xhrGet(`${BACKEND_URL}/api/admin/transactions`);
    if (result.ok) setTransactions(result.data);
  };

  const fetchSettings = async () => {
    const result = await xhrGet(`${BACKEND_URL}/api/admin/settings`);
    if (result.ok) setSettings(result.data);
  };

  const updateUser = async (userId, update) => {
    const result = await xhrPut(`${BACKEND_URL}/api/admin/users/${userId}`, update);
    if (result.ok) {
      toast.success("User updated");
      fetchUsers();
      fetchStats();
    } else {
      toast.error(result.data?.detail || "Failed to update user");
    }
  };

  const deleteUser = async (userId, email) => {
    if (!window.confirm(`Delete user ${email} and ALL their data? This cannot be undone.`)) return;
    const result = await xhrDelete(`${BACKEND_URL}/api/admin/users/${userId}`);
    if (result.ok) {
      toast.success("User deleted");
      fetchUsers();
      fetchStats();
    }
  };

  const updateSettings = async (updates) => {
    const result = await xhrPut(`${BACKEND_URL}/api/admin/settings`, updates);
    if (result.ok) {
      setSettings(result.data);
      toast.success("Settings updated");
    }
  };

  const filteredUsers = users.filter(u => 
    (u.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.email || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const tabs = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "users", label: "Users", icon: Users },
    { id: "transactions", label: "Transactions", icon: CreditCard },
    { id: "settings", label: "Feature Controls", icon: Settings },
    { id: "templates", label: "PDF Templates", icon: Palette },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-slate-400">Loading admin portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white" data-testid="admin-portal">
      {/* Top Bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/dashboard")} className="text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-400" />
            <h1 className="font-space-mono text-lg font-bold">Admin Portal</h1>
          </div>
          <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-medium">OWNER</span>
        </div>
        <span className="text-sm text-slate-400">{currentUser?.email}</span>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-56 bg-slate-900 border-r border-slate-800 min-h-[calc(100vh-52px)] p-4">
          <nav className="space-y-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? "bg-blue-600/20 text-blue-400"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
                data-testid={`admin-tab-${tab.id}`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          {/* OVERVIEW TAB */}
          {activeTab === "overview" && stats && (
            <div>
              <h2 className="text-2xl font-bold mb-6">System Overview</h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard label="Total Users" value={stats.total_users} icon={Users} color="blue" />
                <StatCard label="Total Invoices" value={stats.total_invoices} icon={FileText} color="emerald" />
                <StatCard label="Revenue" value={`£${stats.total_revenue.toFixed(2)}`} icon={DollarSign} color="amber" />
                <StatCard label="Downloads" value={stats.total_downloads} icon={Download} color="purple" />
              </div>
              
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                <StatCard label="Invoice Value" value={`£${stats.total_invoice_value.toFixed(2)}`} icon={TrendingUp} color="emerald" />
                <StatCard label="Paid Invoices" value={stats.paid_invoices} icon={CheckCircle} color="green" />
                <StatCard label="Unpaid Invoices" value={stats.unpaid_invoices} icon={FileText} color="red" />
              </div>

              <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
                <h3 className="text-lg font-semibold mb-4">Plan Distribution</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-slate-800 rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold text-slate-300">{stats.plan_distribution.starter}</p>
                    <p className="text-sm text-slate-500 mt-1">Starter (Free)</p>
                  </div>
                  <div className="bg-slate-800 rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold text-blue-400">{stats.plan_distribution.professional}</p>
                    <p className="text-sm text-slate-500 mt-1">Professional</p>
                  </div>
                  <div className="bg-slate-800 rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold text-amber-400">{stats.plan_distribution.enterprise}</p>
                    <p className="text-sm text-slate-500 mt-1">Enterprise</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* USERS TAB */}
          {activeTab === "users" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">User Management</h2>
                <span className="text-sm text-slate-400">{users.length} total users</span>
              </div>
              
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input 
                  placeholder="Search by name or email..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-slate-900 border-slate-700 text-white"
                  data-testid="admin-user-search"
                />
              </div>

              <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase">
                      <th className="text-left p-4">User</th>
                      <th className="text-left p-4">Plan</th>
                      <th className="text-left p-4">Downloads</th>
                      <th className="text-left p-4">Status</th>
                      <th className="text-right p-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(u => (
                      <UserRow 
                        key={u.user_id} 
                        user={u} 
                        onUpdate={updateUser} 
                        onDelete={deleteUser}
                        isCurrentUser={u.user_id === currentUser?.user_id}
                      />
                    ))}
                  </tbody>
                </table>
                {filteredUsers.length === 0 && (
                  <div className="p-8 text-center text-slate-500">No users found</div>
                )}
              </div>
            </div>
          )}

          {/* TRANSACTIONS TAB */}
          {activeTab === "transactions" && (
            <div>
              <h2 className="text-2xl font-bold mb-6">Payment Transactions</h2>
              <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase">
                      <th className="text-left p-4">Transaction ID</th>
                      <th className="text-left p-4">User</th>
                      <th className="text-left p-4">Plan</th>
                      <th className="text-left p-4">Amount</th>
                      <th className="text-left p-4">Method</th>
                      <th className="text-left p-4">Status</th>
                      <th className="text-left p-4">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map(t => (
                      <tr key={t.transaction_id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                        <td className="p-4 text-sm font-mono text-slate-300">{t.transaction_id}</td>
                        <td className="p-4 text-sm text-slate-300">{t.user_id}</td>
                        <td className="p-4">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            t.plan === "enterprise" ? "bg-amber-500/20 text-amber-400" : "bg-blue-500/20 text-blue-400"
                          }`}>{t.plan}</span>
                        </td>
                        <td className="p-4 text-sm font-semibold text-white">£{t.amount?.toFixed(2)}</td>
                        <td className="p-4 text-sm text-slate-400">{t.payment_method}</td>
                        <td className="p-4">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            t.payment_status === "paid" ? "bg-emerald-500/20 text-emerald-400" : "bg-yellow-500/20 text-yellow-400"
                          }`}>{t.payment_status}</span>
                        </td>
                        <td className="p-4 text-sm text-slate-500">{t.created_at?.slice(0, 10)}</td>
                      </tr>
                    ))}
                    {transactions.length === 0 && (
                      <tr><td colSpan={7} className="p-8 text-center text-slate-500">No transactions yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SETTINGS TAB */}
          {activeTab === "settings" && settings && (
            <FeatureControls settings={settings} onUpdate={updateSettings} />
          )}

          {/* TEMPLATES TAB */}
          {activeTab === "templates" && (
            <TemplateManager />
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }) {
  const colorMap = {
    blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    purple: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    green: "bg-green-500/10 text-green-400 border-green-500/20",
    red: "bg-red-500/10 text-red-400 border-red-500/20",
  };
  return (
    <div className={`rounded-xl p-5 border ${colorMap[color] || colorMap.blue}`} data-testid={`stat-${label.toLowerCase().replace(/\s/g,'-')}`}>
      <div className="flex items-center justify-between mb-3">
        <Icon className="w-5 h-5 opacity-80" />
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs opacity-60 mt-1">{label}</p>
    </div>
  );
}

function UserRow({ user, onUpdate, onDelete, isCurrentUser }) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <>
      <tr className="border-b border-slate-800/50 hover:bg-slate-800/30">
        <td className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold">
              {(user.name || user.email || "?")[0].toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium text-white flex items-center gap-2">
                {user.name || "—"}
                {user.is_owner && <Crown className="w-3 h-3 text-amber-400" />}
              </p>
              <p className="text-xs text-slate-500">{user.email}</p>
            </div>
          </div>
        </td>
        <td className="p-4">
          <select
            value={user.plan || "starter"}
            onChange={(e) => onUpdate(user.user_id, { plan: e.target.value })}
            className="bg-slate-800 border border-slate-700 text-sm rounded px-2 py-1 text-white"
            data-testid={`plan-select-${user.user_id}`}
          >
            <option value="starter">Starter</option>
            <option value="professional">Professional</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </td>
        <td className="p-4 text-sm text-slate-300">{user.download_count || 0}</td>
        <td className="p-4">
          {user.is_disabled ? (
            <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded-full">Disabled</span>
          ) : (
            <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-full">Active</span>
          )}
        </td>
        <td className="p-4 text-right">
          <div className="flex items-center gap-2 justify-end">
            <button
              onClick={() => onUpdate(user.user_id, { is_disabled: !user.is_disabled })}
              className={`p-1.5 rounded-lg transition-colors ${user.is_disabled ? "text-emerald-400 hover:bg-emerald-500/20" : "text-yellow-400 hover:bg-yellow-500/20"}`}
              title={user.is_disabled ? "Enable user" : "Disable user"}
              data-testid={`toggle-user-${user.user_id}`}
            >
              {user.is_disabled ? <ToggleLeft className="w-4 h-4" /> : <ToggleRight className="w-4 h-4" />}
            </button>
            {!isCurrentUser && (
              <button
                onClick={() => onDelete(user.user_id, user.email)}
                className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/20 transition-colors"
                title="Delete user"
                data-testid={`delete-user-${user.user_id}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button onClick={() => setExpanded(!expanded)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-700">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={5} className="bg-slate-800/30 px-6 py-4">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div><span className="text-slate-500">User ID:</span> <span className="text-slate-300 font-mono text-xs">{user.user_id}</span></div>
              <div><span className="text-slate-500">Auth:</span> <span className="text-slate-300">{user.auth_provider || "email"}</span></div>
              <div><span className="text-slate-500">Created:</span> <span className="text-slate-300">{user.created_at?.slice(0, 10) || "—"}</span></div>
              <div><span className="text-slate-500">Company:</span> <span className="text-slate-300">{user.company_details?.name || "—"}</span></div>
              <div><span className="text-slate-500">Template:</span> <span className="text-slate-300">{user.pdf_template || "classic"}</span></div>
              <div><span className="text-slate-500">Subscription:</span> <span className="text-slate-300">{user.subscription_status || "—"}</span></div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function FeatureControls({ settings, onUpdate }) {
  const [localSettings, setLocalSettings] = useState(settings);
  
  useEffect(() => { setLocalSettings(settings); }, [settings]);

  const toggleFeature = (key) => {
    const updated = { ...localSettings.features, [key]: !localSettings.features[key] };
    setLocalSettings({ ...localSettings, features: updated });
    onUpdate({ features: updated });
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Feature Controls</h2>
      
      {/* Limits */}
      <div className="bg-slate-900 rounded-xl p-6 border border-slate-800 mb-6">
        <h3 className="text-lg font-semibold mb-4">Limits & Pricing</h3>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <Label className="text-slate-400 text-sm">Free Download Limit</Label>
            <Input
              type="number"
              value={localSettings.free_download_limit}
              onChange={(e) => setLocalSettings({ ...localSettings, free_download_limit: parseInt(e.target.value) || 0 })}
              className="bg-slate-800 border-slate-700 text-white mt-1"
              data-testid="admin-download-limit"
            />
          </div>
          <div>
            <Label className="text-slate-400 text-sm">Max Invoices (Free Users)</Label>
            <Input
              type="number"
              value={localSettings.max_invoices_per_free_user}
              onChange={(e) => setLocalSettings({ ...localSettings, max_invoices_per_free_user: parseInt(e.target.value) || 0 })}
              className="bg-slate-800 border-slate-700 text-white mt-1"
            />
          </div>
          <div>
            <Label className="text-slate-400 text-sm">Professional Price (£)</Label>
            <Input
              type="number"
              step="0.01"
              value={localSettings.pricing?.professional || 5}
              onChange={(e) => setLocalSettings({ 
                ...localSettings, 
                pricing: { ...localSettings.pricing, professional: parseFloat(e.target.value) || 0 }
              })}
              className="bg-slate-800 border-slate-700 text-white mt-1"
              data-testid="admin-pro-price"
            />
          </div>
          <div>
            <Label className="text-slate-400 text-sm">Enterprise Price (£)</Label>
            <Input
              type="number"
              step="0.01"
              value={localSettings.pricing?.enterprise || 49.90}
              onChange={(e) => setLocalSettings({ 
                ...localSettings, 
                pricing: { ...localSettings.pricing, enterprise: parseFloat(e.target.value) || 0 }
              })}
              className="bg-slate-800 border-slate-700 text-white mt-1"
              data-testid="admin-ent-price"
            />
          </div>
        </div>
        <Button 
          onClick={() => onUpdate({ 
            free_download_limit: localSettings.free_download_limit,
            max_invoices_per_free_user: localSettings.max_invoices_per_free_user,
            pricing: localSettings.pricing
          })}
          className="mt-4 bg-blue-600 hover:bg-blue-700"
          data-testid="admin-save-limits"
        >
          Save Limits & Pricing
        </Button>
      </div>

      {/* Feature Toggles */}
      <div className="bg-slate-900 rounded-xl p-6 border border-slate-800 mb-6">
        <h3 className="text-lg font-semibold mb-4">Feature Toggles</h3>
        <div className="space-y-4">
          {Object.entries(localSettings.features || {}).map(([key, enabled]) => (
            <div key={key} className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
              <div>
                <p className="text-sm font-medium text-white capitalize">{key.replace(/_/g, " ")}</p>
                <p className="text-xs text-slate-500">
                  {key === "email_sending" && "Allow users to send invoices via email"}
                  {key === "pdf_downloads" && "Allow users to download invoice PDFs"}
                  {key === "recurring_invoices" && "Enable recurring invoice feature"}
                  {key === "google_pay" && "Show Google Pay as payment option"}
                  {key === "direct_debit" && "Show Direct Debit (BACS) as payment option"}
                </p>
              </div>
              <button
                onClick={() => toggleFeature(key)}
                className={`w-12 h-6 rounded-full transition-colors relative ${enabled ? "bg-blue-600" : "bg-slate-700"}`}
                data-testid={`toggle-${key}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${enabled ? "left-6" : "left-0.5"}`} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Maintenance Mode */}
      <div className="bg-slate-900 rounded-xl p-6 border border-red-900/30">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-red-400">Maintenance Mode</h3>
            <p className="text-sm text-slate-500">When enabled, only admins can access the platform</p>
          </div>
          <button
            onClick={() => onUpdate({ maintenance_mode: !localSettings.maintenance_mode })}
            className={`w-12 h-6 rounded-full transition-colors relative ${localSettings.maintenance_mode ? "bg-red-600" : "bg-slate-700"}`}
            data-testid="toggle-maintenance"
          >
            <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${localSettings.maintenance_mode ? "left-6" : "left-0.5"}`} />
          </button>
        </div>
      </div>
    </div>
  );
}

function TemplateManager() {
  const [templates, setTemplates] = useState({});
  const [newTemplate, setNewTemplate] = useState({ template_id: "", name: "", header_color: "#000000", accent_color: "#333333", text_color: "#000000" });

  useEffect(() => { fetchTemplates(); }, []);

  const fetchTemplates = async () => {
    const result = await xhrGet(`${BACKEND_URL}/api/pdf-templates`);
    if (result.ok) setTemplates(result.data);
  };

  const addTemplate = async () => {
    if (!newTemplate.template_id || !newTemplate.name) {
      toast.error("Template ID and name are required");
      return;
    }
    const result = await xhrPost(`${BACKEND_URL}/api/admin/templates`, newTemplate);
    if (result.ok) {
      setTemplates(result.data.templates);
      setNewTemplate({ template_id: "", name: "", header_color: "#000000", accent_color: "#333333", text_color: "#000000" });
      toast.success("Template saved");
    }
  };

  const removeTemplate = async (id) => {
    const result = await xhrDelete(`${BACKEND_URL}/api/admin/templates/${id}`);
    if (result.ok) {
      setTemplates(result.data.templates);
      toast.success("Template deleted");
    } else {
      toast.error(result.data?.detail || "Cannot delete template");
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">PDF Templates</h2>
      
      {/* Existing Templates */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {Object.entries(templates).map(([id, t]) => (
          <div key={id} className="bg-slate-900 rounded-xl p-5 border border-slate-800">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded" style={{ backgroundColor: t.header_color }}></div>
              <div className="w-8 h-8 rounded" style={{ backgroundColor: t.accent_color }}></div>
            </div>
            <p className="font-semibold text-white">{t.name}</p>
            <p className="text-xs text-slate-500 font-mono mt-1">{id}</p>
            <div className="flex items-center gap-2 mt-3">
              <span className="text-xs text-slate-400">{t.header_color}</span>
              <span className="text-xs text-slate-400">{t.accent_color}</span>
              {id !== "classic" && (
                <button onClick={() => removeTemplate(id)} className="ml-auto text-red-400 hover:text-red-300">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add New Template */}
      <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
        <h3 className="text-lg font-semibold mb-4">Add / Edit Template</h3>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <Label className="text-slate-400 text-xs">Template ID</Label>
            <Input value={newTemplate.template_id} onChange={(e) => setNewTemplate({...newTemplate, template_id: e.target.value})} placeholder="e.g. ocean" className="bg-slate-800 border-slate-700 text-white mt-1" />
          </div>
          <div>
            <Label className="text-slate-400 text-xs">Name</Label>
            <Input value={newTemplate.name} onChange={(e) => setNewTemplate({...newTemplate, name: e.target.value})} placeholder="e.g. Ocean Blue" className="bg-slate-800 border-slate-700 text-white mt-1" />
          </div>
          <div>
            <Label className="text-slate-400 text-xs">Header Color</Label>
            <div className="flex items-center gap-2 mt-1">
              <input type="color" value={newTemplate.header_color} onChange={(e) => setNewTemplate({...newTemplate, header_color: e.target.value})} className="w-10 h-10 rounded cursor-pointer" />
              <Input value={newTemplate.header_color} onChange={(e) => setNewTemplate({...newTemplate, header_color: e.target.value})} className="bg-slate-800 border-slate-700 text-white text-xs" />
            </div>
          </div>
          <div>
            <Label className="text-slate-400 text-xs">Accent Color</Label>
            <div className="flex items-center gap-2 mt-1">
              <input type="color" value={newTemplate.accent_color} onChange={(e) => setNewTemplate({...newTemplate, accent_color: e.target.value})} className="w-10 h-10 rounded cursor-pointer" />
              <Input value={newTemplate.accent_color} onChange={(e) => setNewTemplate({...newTemplate, accent_color: e.target.value})} className="bg-slate-800 border-slate-700 text-white text-xs" />
            </div>
          </div>
          <div className="flex items-end">
            <Button onClick={addTemplate} className="bg-blue-600 hover:bg-blue-700 w-full" data-testid="admin-add-template">
              Save Template
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
