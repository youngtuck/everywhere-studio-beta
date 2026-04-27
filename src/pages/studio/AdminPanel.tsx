import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import { Check, Copy, Shield, Users, Key, BarChart3 } from "lucide-react";

const API_BASE = (import.meta.env.VITE_API_BASE ?? "").replace(/\/$/, "");

function generateCode(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let code = "EW-";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function timeAgo(iso: string): string {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

async function adminFetch(action: string, params: Record<string, any> = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("No auth session");
  const res = await fetch(`${API_BASE}/api/admin-data`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ action, ...params }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    console.error(`[Admin] API error for ${action}:`, res.status, body);
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res.json();
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
}

type Tab = "invite" | "people" | "codes" | "dashboard";

export default function AdminPanel() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>("invite");

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("is_admin").eq("id", user.id).single()
      .then(({ data }) => {
        if (!data?.is_admin) { navigate("/studio/dashboard"); return; }
        setIsAdmin(true);
      });
  }, [user, navigate]);

  if (isAdmin === null) return <div style={{ padding: 48, textAlign: "center", color: "var(--fg-3)" }}>Loading...</div>;

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: "invite", label: "Invite", icon: Key },
    { key: "people", label: "People", icon: Users },
    { key: "codes", label: "Access Codes", icon: Shield },
    { key: "dashboard", label: "Overview", icon: BarChart3 },
  ];

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 24px", fontFamily: "'Inter', sans-serif" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: "var(--fg)", margin: "0 0 24px", letterSpacing: "-0.02em" }}>Admin</h1>
      <div style={{ display: "flex", gap: 4, marginBottom: 32, borderBottom: "1px solid var(--glass-border)", paddingBottom: 0 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: "10px 20px", border: "none", borderBottom: tab === t.key ? "2px solid var(--gold-dark)" : "2px solid transparent",
            background: "none", cursor: "pointer", fontSize: 14, fontWeight: tab === t.key ? 600 : 400,
            color: tab === t.key ? "var(--fg)" : "var(--fg-3)", fontFamily: "'Inter', sans-serif",
            display: "flex", alignItems: "center", gap: 6, transition: "all 0.15s ease",
          }}>
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {tab === "invite" && <InviteTab />}
      {tab === "people" && <PeopleTab />}
      {tab === "codes" && <CodesTab />}
      {tab === "dashboard" && <DashboardTab />}
    </div>
  );
}

// ── INVITE TAB ────────────────────────────────────
function InviteTab() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState<{ code: string; name: string } | null>(null);
  const [recentInvites, setRecentInvites] = useState<any[]>([]);
  const [copied, setCopied] = useState("");

  useEffect(() => {
    adminFetch("get_codes").then(d => setRecentInvites((d.codes || []).slice(0, 10))).catch(() => {});
  }, []);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    const code = generateCode();
    try {
      await adminFetch("create_code", { name: name.trim(), email: email.trim() || null, note: note.trim() || null, code });
      setResult({ code, name: name.trim() });
      setName(""); setEmail(""); setNote("");
      adminFetch("get_codes").then(d => setRecentInvites((d.codes || []).slice(0, 10)));
    } catch (err: any) {
      alert(err.message || "Failed to create code");
    }
    setCreating(false);
  };

  const inviteMessage = result ? `Hey ${result.name}, I'd like you to try IdeasOut. It's an AI content system that actually sounds like you, not like AI. Here's your invite code: ${result.code}. Sign up at everywherestudio-one.vercel.app` : "";

  const handleCopy = (text: string, label: string) => { copyToClipboard(text); setCopied(label); setTimeout(() => setCopied(""), 1500); };

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: result ? "1fr 1fr" : "1fr", gap: 24 }}>
        <div className="liquid-glass-card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--fg)", margin: "0 0 16px" }}>Generate Invite Code</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Who are you inviting?" style={inputStyle} />
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Their email (optional)" style={inputStyle} />
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="How do you know them? (optional)" style={inputStyle} />
            <button onClick={handleCreate} disabled={!name.trim() || creating} style={{ ...btnGold, opacity: name.trim() && !creating ? 1 : 0.5 }}>
              {creating ? "Creating..." : "Generate Invite Code"}
            </button>
          </div>
        </div>

        {result && (
          <div className="liquid-glass-card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--fg)", margin: "0 0 16px" }}>Invite Created</h3>
            <div style={{ fontSize: 28, fontWeight: 700, color: "var(--gold-dark)", letterSpacing: "2px", marginBottom: 12, fontFamily: "'Inter', sans-serif" }}>
              {result.code}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button onClick={() => handleCopy(result.code, "code")} style={{ ...btnOutline, color: copied === "code" ? "#50c8a0" : undefined }}>
                {copied === "code" ? <Check size={14} /> : <Copy size={14} />} {copied === "code" ? "Copied!" : "Copy Code"}
              </button>
              <button onClick={() => handleCopy(inviteMessage, "msg")} style={{ ...btnOutline, color: copied === "msg" ? "#50c8a0" : undefined }}>
                {copied === "msg" ? <Check size={14} /> : <Copy size={14} />} {copied === "msg" ? "Copied!" : "Copy Invite Message"}
              </button>
              {email && (
                <a href={`mailto:${email}?subject=Your IdeasOut Invite&body=${encodeURIComponent(inviteMessage)}`} style={{ ...btnOutline, textDecoration: "none", textAlign: "center" }}>
                  Send via Email
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {recentInvites.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--fg-3)", margin: "0 0 12px", letterSpacing: "1px", textTransform: "uppercase" }}>Recent Invites</h3>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {recentInvites.map(c => (
              <div key={c.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--glass-border)", fontSize: 13 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontWeight: 600, color: "var(--fg)", fontFamily: "'Inter', sans-serif", letterSpacing: "1px" }}>{c.code}</span>
                  <span style={{ color: "var(--fg-2)" }}>{c.assigned_name || "Anyone"}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4,
                    background: c.used_by ? "rgba(74,144,217,0.08)" : c.is_active ? "rgba(80,200,160,0.08)" : "rgba(200,100,100,0.08)",
                    color: c.used_by ? "#4A90D9" : c.is_active ? "#50c8a0" : "#E53935",
                  }}>{c.used_by ? "Redeemed" : c.is_active ? "Available" : "Inactive"}</span>
                  <button onClick={() => { copyToClipboard(c.code); setCopied(c.id); setTimeout(() => setCopied(""), 1500); }} style={{ background: "none", border: "none", cursor: "pointer", color: copied === c.id ? "#50c8a0" : "var(--fg-3)", padding: 4, transition: "color 0.15s" }}>
                    {copied === c.id ? <Check size={12} /> : <Copy size={12} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── PEOPLE TAB ────────────────────────────────────
function PeopleTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);

  useEffect(() => {
    adminFetch("get_users")
      .then(d => {
        setUsers(d.users || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("[Admin] Failed to load users:", err);
        setLoading(false);
      });
  }, []);

  const getStatus = (u: any) => {
    if (!u.created_at) return u.onboarding_complete ? "active" : "onboarding";
    const daysSinceSignup = (Date.now() - new Date(u.created_at).getTime()) / 86400000;
    if (daysSinceSignup < 2) return "new";
    if (!u.onboarding_complete) return "onboarding";
    if (u.lastActive) {
      const daysSinceActive = (Date.now() - new Date(u.lastActive).getTime()) / 86400000;
      if (daysSinceActive > 7) return "inactive";
      return "active";
    }
    return "inactive";
  };

  const statusColors: Record<string, { bg: string; text: string; label: string }> = {
    new: { bg: "rgba(74,144,217,0.08)", text: "#4A90D9", label: "New" },
    active: { bg: "rgba(80,200,160,0.08)", text: "#50c8a0", label: "Active" },
    onboarding: { bg: "rgba(245,198,66,0.08)", text: "#F5C642", label: "Onboarding" },
    inactive: { bg: "rgba(100,116,139,0.08)", text: "#64748B", label: "Inactive" },
  };

  const filtered = users.filter(u => {
    if (filter !== "all" && getStatus(u) !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (u.full_name || "").toLowerCase().includes(q) || (u.email || "").toLowerCase().includes(q);
    }
    return true;
  });

  const loadDetail = async (userId: string) => {
    if (expandedId === userId) { setExpandedId(null); return; }
    setExpandedId(userId);
    const d = await adminFetch("get_user_detail", { targetUserId: userId });
    setDetail(d);
  };

  const handleResetOnboarding = async (userId: string) => {
    if (!confirm("Reset this user's onboarding? They'll need to redo Voice DNA setup.")) return;
    await adminFetch("reset_onboarding", { targetUserId: userId });
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, onboarding_complete: false } : u));
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "var(--fg-3)" }}>Loading users...</div>;

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {["all", "active", "new", "onboarding", "inactive"].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: "6px 14px", borderRadius: 6, border: "none",
            background: filter === f ? "var(--fg)" : "transparent", color: filter === f ? "var(--bg)" : "var(--fg-3)",
            fontSize: 13, fontWeight: 500, cursor: "pointer", textTransform: "capitalize",
          }}>{f}</button>
        ))}
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." style={{ ...inputStyle, flex: 1, minWidth: 160 }} />
      </div>

      <div className="liquid-glass-card" style={{ overflow: "hidden" }}>
        {filtered.map(u => {
          const status = getStatus(u);
          const sc = statusColors[status];
          const expanded = expandedId === u.id;
          return (
            <div key={u.id}>
              <button type="button" onClick={() => loadDetail(u.id)} style={{
                width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
                background: expanded ? "rgba(74,144,217,0.03)" : "transparent", border: "none", borderBottom: "1px solid var(--glass-border)",
                cursor: "pointer", fontFamily: "'Inter', sans-serif", textAlign: "left",
              }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: u.voice_dna_completed ? "#50c8a0" : "var(--fg-3)", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.full_name || "Unnamed"}</div>
                  <div style={{ fontSize: 12, color: "var(--fg-3)" }}>{u.email}</div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4, background: sc.bg, color: sc.text }}>{sc.label}</span>
                <span style={{ fontSize: 13, color: "var(--fg-3)", width: 50, textAlign: "right" }}>{u.outputCount}</span>
                <span style={{ fontSize: 13, color: u.avgScore >= 900 ? "#50c8a0" : u.avgScore > 0 ? "var(--fg-2)" : "var(--fg-3)", width: 40, textAlign: "right", fontWeight: 600 }}>{u.avgScore || "-"}</span>
                <span style={{ fontSize: 12, color: "var(--fg-3)", width: 70, textAlign: "right" }}>{u.lastActive ? timeAgo(u.lastActive) : "Never"}</span>
              </button>
              {expanded && detail && (
                <div style={{ padding: "12px 16px 16px 36px", borderBottom: "1px solid var(--glass-border)", background: "rgba(74,144,217,0.02)" }}>
                  {detail.outputs?.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--fg-3)", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 6 }}>Recent Outputs</div>
                      {detail.outputs.map((o: any) => (
                        <div key={o.id} style={{ fontSize: 13, color: "var(--fg-2)", padding: "4px 0", display: "flex", gap: 8 }}>
                          <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.title}</span>
                          <span style={{ color: "var(--fg-3)" }}>{o.output_type}</span>
                          <span style={{ fontWeight: 600, color: o.score >= 90 ? "#50c8a0" : "var(--fg-2)" }}>{o.score}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button onClick={() => handleResetOnboarding(u.id)} style={btnSmall}>Reset Onboarding</button>
                    <a href={`mailto:${u.email}?subject=Welcome to IdeasOut`} style={{ ...btnSmall, textDecoration: "none" }}>Send Welcome</a>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && <div style={{ padding: 32, textAlign: "center", color: "var(--fg-3)", fontSize: 14 }}>No users match this filter</div>}
      </div>
    </div>
  );
}

// ── CODES TAB ─────────────────────────────────────
function CodesTab() {
  const [codes, setCodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [bulkNote, setBulkNote] = useState("");
  const [bulkCount, setBulkCount] = useState(5);
  const [bulkCreating, setBulkCreating] = useState(false);

  const load = useCallback(() => {
    adminFetch("get_codes").then(d => { setCodes(d.codes || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const handleToggle = async (id: string, active: boolean) => {
    await adminFetch("toggle_code", { codeId: id, active });
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this code permanently?")) return;
    await adminFetch("delete_code", { codeId: id });
    load();
  };

  const handleBulk = async () => {
    setBulkCreating(true);
    const newCodes = Array.from({ length: bulkCount }, () => generateCode());
    await adminFetch("create_bulk_codes", { codes: newCodes, note: bulkNote.trim() || null });
    setBulkNote("");
    setBulkCreating(false);
    load();
  };

  const available = codes.filter(c => c.is_active && !c.used_by).length;
  const redeemed = codes.filter(c => c.used_by).length;
  const deactivated = codes.filter(c => !c.is_active).length;

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "var(--fg-3)" }}>Loading codes...</div>;

  return (
    <div>
      <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        {[
          { label: "Total", value: codes.length, color: "var(--fg)" },
          { label: "Available", value: available, color: "#50c8a0" },
          { label: "Redeemed", value: redeemed, color: "#4A90D9" },
          { label: "Deactivated", value: deactivated, color: "#E53935" },
        ].map(s => (
          <div key={s.label} className="liquid-glass-card" style={{ padding: "12px 20px" }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: "var(--fg-3)" }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="liquid-glass-card" style={{ padding: 16, marginBottom: 24, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <input value={bulkNote} onChange={e => setBulkNote(e.target.value)} placeholder="Batch note (e.g. AI Summit)" style={{ ...inputStyle, flex: 1, minWidth: 200 }} />
        <select value={bulkCount} onChange={e => setBulkCount(Number(e.target.value))} style={{ ...inputStyle, width: 60 }}>
          <option value={5}>5</option><option value={10}>10</option><option value={20}>20</option>
        </select>
        <button onClick={handleBulk} disabled={bulkCreating} style={btnGold}>{bulkCreating ? "Creating..." : "Create Bulk Codes"}</button>
      </div>

      <div className="liquid-glass-card" style={{ overflow: "hidden" }}>
        {codes.map(c => (
          <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderBottom: "1px solid var(--glass-border)", fontSize: 13 }}>
            <span style={{ fontWeight: 600, color: "var(--fg)", letterSpacing: "1px", width: 100, fontFamily: "'Inter', sans-serif" }}>{c.code}</span>
            <span style={{ color: "var(--fg-2)", width: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.assigned_name || "-"}</span>
            <span style={{
              fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4,
              background: c.used_by ? "rgba(74,144,217,0.08)" : c.is_active ? "rgba(80,200,160,0.08)" : "rgba(200,100,100,0.08)",
              color: c.used_by ? "#4A90D9" : c.is_active ? "#50c8a0" : "#E53935",
            }}>{c.used_by ? "Redeemed" : c.is_active ? "Available" : "Inactive"}</span>
            <span style={{ flex: 1, color: "var(--fg-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.redeemed_name || c.note || ""}</span>
            <span style={{ color: "var(--fg-3)", fontSize: 12 }}>{timeAgo(c.created_at)}</span>
            <button onClick={() => handleToggle(c.id, !c.is_active)} style={btnSmall}>{c.is_active ? "Deactivate" : "Activate"}</button>
            <button onClick={() => handleDelete(c.id)} style={{ ...btnSmall, color: "#E53935" }}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── DASHBOARD TAB ─────────────────────────────────
function DashboardTab() {
  const [stats, setStats] = useState<any>(null);
  const [activity, setActivity] = useState<any[]>([]);

  useEffect(() => {
    adminFetch("get_stats").then(d => setStats(d)).catch(() => {});
    adminFetch("get_activity").then(d => setActivity(d.events || [])).catch(() => {});
  }, []);

  if (!stats) return <div style={{ padding: 40, textAlign: "center", color: "var(--fg-3)" }}>Loading stats...</div>;

  const metrics = [
    { label: "Total Users", value: stats.totalUsers, sub: `+${stats.newUsersThisWeek} this week` },
    { label: "Onboarded", value: `${stats.onboarded}/${stats.totalUsers}`, sub: stats.totalUsers > 0 ? `${Math.round(stats.onboarded / stats.totalUsers * 100)}%` : "0%" },
    { label: "Total Outputs", value: stats.totalOutputs, sub: `+${stats.outputsThisWeek} this week` },
    { label: "Avg Score", value: stats.avgScore || "-" },
    { label: "Published (900+)", value: stats.published },
    { label: "Invite Codes", value: `${stats.availableCodes} available`, sub: `${stats.redeemedCodes} redeemed` },
  ];

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 32 }}>
        {metrics.map(m => (
          <div key={m.label} className="liquid-glass-card" style={{ padding: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--fg-3)", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 4 }}>{m.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: "var(--fg)" }}>{m.value}</div>
            {m.sub && <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 2 }}>{m.sub}</div>}
          </div>
        ))}
      </div>

      <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--fg-3)", margin: "0 0 12px", letterSpacing: "1px", textTransform: "uppercase" }}>Activity Feed</h3>
      <div className="liquid-glass-card" style={{ overflow: "hidden" }}>
        {activity.map((e, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderBottom: "1px solid var(--glass-border)", fontSize: 13 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: e.type === "signup" ? "#4A90D9" : "#F5C642", flexShrink: 0 }} />
            <span style={{ fontWeight: 600, color: "var(--fg)" }}>{e.name}</span>
            <span style={{ color: "var(--fg-3)", flex: 1 }}>{e.detail}</span>
            <span style={{ color: "var(--fg-3)", fontSize: 12, flexShrink: 0 }}>{timeAgo(e.ts)}</span>
          </div>
        ))}
        {activity.length === 0 && <div style={{ padding: 32, textAlign: "center", color: "var(--fg-3)" }}>No recent activity</div>}
      </div>
    </div>
  );
}

// ── SHARED STYLES ─────────────────────────────────
const inputStyle: React.CSSProperties = {
  padding: "10px 12px", borderRadius: 8, border: "1px solid var(--glass-border)",
  background: "var(--glass-input)", fontSize: 14, fontFamily: "'Inter', sans-serif",
  color: "var(--fg)", outline: "none",
  backdropFilter: "var(--glass-blur-light)", WebkitBackdropFilter: "var(--glass-blur-light)",
};
const btnGold: React.CSSProperties = {
  padding: "10px 20px", borderRadius: 8, border: "none",
  background: "#F5C642", color: "#0D1B2A", fontSize: 14, fontWeight: 700,
  cursor: "pointer", fontFamily: "'Inter', sans-serif",
};
const btnOutline: React.CSSProperties = {
  padding: "8px 14px", borderRadius: 8, border: "1px solid var(--glass-border)",
  background: "transparent", color: "var(--fg-2)", fontSize: 13, fontWeight: 500,
  cursor: "pointer", fontFamily: "'Inter', sans-serif",
  display: "flex", alignItems: "center", gap: 6, justifyContent: "center",
};
const btnSmall: React.CSSProperties = {
  padding: "4px 10px", borderRadius: 4, border: "1px solid var(--glass-border)",
  background: "transparent", color: "var(--fg-3)", fontSize: 12,
  cursor: "pointer", fontFamily: "'Inter', sans-serif",
};
