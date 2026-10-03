import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { AlertTriangle, BrainCircuit, CheckCircle2, ClipboardCheck, Clock3, FileText, Loader2, LogOut, MapPin, RefreshCw, ShieldCheck, Users } from "lucide-react";
import { toast } from "sonner";

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

export default function Admin() {
  const [, setLocation] = useLocation();
  const [password, setPassword] = useState("");
  const adminMe = trpc.admin.me.useQuery(undefined, { retry: false });
  const login = trpc.auth.adminLogin.useMutation({
    onSuccess: async () => {
      await adminMe.refetch();
      toast.success("Admin dashboard unlocked");
    },
    onError: error => toast.error(error.message),
  });
  const logout = trpc.auth.adminLogout.useMutation({
    onSuccess: () => {
      toast.success("Admin session closed");
      setLocation("/");
    },
  });
  const isAdmin = Boolean(adminMe.data?.authenticated);
  const stats = trpc.admin.stats.useQuery(undefined, { enabled: isAdmin, retry: false });
  const reports = trpc.admin.reports.useQuery(undefined, { enabled: isAdmin, retry: false });
  const signIns = trpc.admin.signIns.useQuery(undefined, { enabled: isAdmin, retry: false });
  const [officerTab, setOfficerTab] = useState<"command" | "reports" | "signins">("command");
  const [aiSummary, setAiSummary] = useState<{ summary: string; items: Array<{ id: number; priority: string; category: string; rationale: string; recommendedAction: string }> } | null>(null);
  const summarize = trpc.admin.summarizeReports.useMutation({ onSuccess: result => { setAiSummary(result); toast.success("Reports prioritized"); }, onError: error => toast.error("AI triage failed", { description: error.message }) });
  const updateStatus = trpc.admin.updateReportStatus.useMutation({ onSuccess: () => { void reports.refetch(); toast.success("Case status updated"); }, onError: error => toast.error("Could not update case", { description: error.message }) });

  useEffect(() => {
    if (adminMe.error && adminMe.error.data?.code !== "FORBIDDEN") toast.error(adminMe.error.message);
  }, [adminMe.error]);

  return <DashboardLayout allowGuest onSignOut={() => logout.mutate()}>
    {!isAdmin ? (
      <div className="flex min-h-[70vh] items-center justify-center p-4">
        <div className="w-full max-w-md rounded-[28px] border border-[#dce7dc] bg-[#fcfbf8] p-8 shadow-[0_20px_60px_rgba(31,73,56,0.1)]">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#e7f2e8] text-[#1f4938]"><ShieldCheck size={27} /></div>
          <p className="mt-6 text-center text-[10px] font-bold uppercase tracking-[0.18em] text-[#7a8c80]">Restricted area</p>
          <h1 className="mt-2 text-center font-display text-3xl font-semibold text-[#1f4938]">Admin sign in</h1>
          <p className="mt-3 text-center text-sm leading-6 text-[#718078]">Use the server-protected administrator password to review community reports and sign-in activity.</p>
          <form onSubmit={event => { event.preventDefault(); login.mutate({ password }); }} className="mt-7 space-y-4">
            <label className="block"><span className="form-label">Admin password</span><input autoFocus required type="password" value={password} onChange={event => setPassword(event.target.value)} className="form-input" autoComplete="current-password" /></label>
            <button disabled={login.isPending} type="submit" className="form-button w-full justify-center">{login.isPending ? <><Loader2 size={16} className="animate-spin" /> Checking…</> : <><ShieldCheck size={16} /> Unlock dashboard</>}</button>
          </form>
          <button onClick={() => setLocation("/")} className="mx-auto mt-5 block text-xs font-bold text-[#4f765d] hover:underline">Back to citizen monitor</button>
        </div>
      </div>
    ) : (
      <div className="mx-auto max-w-7xl space-y-8 px-2 py-4 sm:px-4">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#7b8b80]">Operations console</p><h1 className="mt-2 font-display text-4xl font-semibold tracking-[-0.04em] text-[#1f4938]">Citizen safety desk</h1><p className="mt-2 max-w-xl text-sm leading-6 text-[#718078]">Review incoming field reports and understand who is using the public monitor.</p></div><div className="flex gap-2"><button onClick={() => summarize.mutate()} disabled={summarize.isPending} className="flex items-center gap-2 rounded-full bg-[#d37e4c] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#bf6d3d] disabled:opacity-60"><BrainCircuit size={14} /> {summarize.isPending ? "Prioritizing…" : "AI prioritize"}</button><button onClick={() => { void stats.refetch(); void reports.refetch(); void signIns.refetch(); }} className="flex items-center gap-2 rounded-full border border-[#dfe3da] px-4 py-2.5 text-xs font-bold text-[#315542] hover:bg-white"><RefreshCw size={14} /> Refresh</button><button onClick={() => logout.mutate()} className="flex items-center gap-2 rounded-full bg-[#1f4938] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#17392b]"><LogOut size={14} /> Sign out</button></div></div>
        <div className="rounded-[28px] border border-[#d8e7d9] bg-[linear-gradient(120deg,#eaf5e9,#fff8ed)] p-5 shadow-sm"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div className="flex items-start gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#1f4938] text-[#f4c993] shadow-sm"><ClipboardCheck size={21} /></div><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#5d7b64]">Officer workspace</p><h2 className="mt-1 font-display text-2xl font-semibold text-[#244b38]">From alert to action.</h2><p className="mt-1 max-w-xl text-sm leading-6 text-[#6d7f73]">Triage community reports, verify field evidence, and move each case through a clear response path.</p></div></div><div className="flex flex-wrap gap-2">{([["command", "Command view"], ["reports", "Case queue"], ["signins", "People & access"]] as const).map(([key, label]) => <button key={key} onClick={() => setOfficerTab(key)} className={`rounded-full px-3.5 py-2 text-xs font-bold transition ${officerTab === key ? "bg-[#1f4938] text-white" : "border border-[#cfe0d0] bg-white/70 text-[#4c7259] hover:bg-white"}`}>{label}</button>)}</div></div></div><div className="grid gap-4 sm:grid-cols-3"><StatCard icon={<FileText size={18} />} label="Incident reports" value={stats.data?.reports ?? "—"} /><StatCard icon={<Users size={18} />} label="Registered users" value={stats.data?.users ?? "—"} /><StatCard icon={<Clock3 size={18} />} label="Recorded sign-ins" value={stats.data?.signIns ?? "—"} /></div>
        <section className={`overflow-hidden rounded-[24px] border border-[#e4e8e0] bg-[#fcfbf8] shadow-sm ${officerTab === "signins" ? "hidden" : ""}`}><div className="flex items-center justify-between border-b border-[#eceee8] px-5 py-4"><div><h2 className="font-display text-2xl font-semibold text-[#244b38]">Community reports</h2><p className="mt-1 text-xs text-[#7d8a82]">Newest reports appear first.</p></div><AlertTriangle size={20} className="text-[#c88334]" /></div><div className="divide-y divide-[#eff1ed]">{reports.isLoading ? <LoadingRow /> : reports.data?.length ? reports.data.map(report => <div key={report.id} className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_1.6fr_auto] md:items-center"><div><p className="text-xs font-bold uppercase tracking-[0.1em] text-[#799080]">Report #{report.id} · {report.corridorId}</p><p className="mt-1 text-sm font-semibold text-[#294836]">{report.description}</p></div><div className="flex flex-wrap gap-3 text-xs text-[#748178]"><span>{formatDate(report.createdAt)}</span>{report.latitude && report.longitude ? <a className="flex items-center gap-1 font-bold text-[#397256] hover:underline" href={`https://www.google.com/maps?q=${report.latitude},${report.longitude}`} target="_blank" rel="noreferrer"><MapPin size={13} /> GPS attached</a> : <span>No GPS</span>}{report.imageUrl && <a className="font-bold text-[#397256] hover:underline" href={report.imageUrl} target="_blank" rel="noreferrer">View photo</a>}</div><div className="flex items-center gap-2"><span className="w-fit rounded-full bg-[#fff3df] px-2.5 py-1 text-[10px] font-bold capitalize text-[#a8681f]">{report.status}</span><select aria-label={`Update status for report ${report.id}`} value={report.status} onChange={event => updateStatus.mutate({ id: report.id, status: event.target.value as "received" | "reviewing" | "resolved" })} className="rounded-full border border-[#dfe3da] bg-white px-2 py-1 text-[10px] font-bold text-[#55725c]"><option value="received">Received</option><option value="reviewing">Reviewing</option><option value="resolved">Resolved</option></select></div></div>) : <EmptyRow label="No incident reports yet" />}</div></section>
        {aiSummary && <section className="overflow-hidden rounded-[24px] border border-[#ead9c4] bg-[#fffaf2] shadow-sm"><div className="flex items-center justify-between border-b border-[#f1e5d4] px-5 py-4"><div><h2 className="font-display text-2xl font-semibold text-[#6d471f]">AI triage brief</h2><p className="mt-1 text-xs text-[#8f7657]">A decision aid for field teams. Verify against official channels before dispatch.</p></div><div className="flex items-center gap-2"><CheckCircle2 size={20} className="text-[#5b8a67]" /><BrainCircuit size={20} className="text-[#c88334]" /></div></div><div className="px-5 py-4"><p className="text-sm leading-6 text-[#674d32]">{aiSummary.summary}</p><div className="mt-4 grid gap-3">{aiSummary.items.map(item => <div key={item.id} className="rounded-2xl border border-[#eedfc9] bg-white/70 p-4"><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-bold text-[#6d471f]">Report #{item.id}</span><span className="rounded-full bg-[#f7e6c8] px-2 py-1 text-[10px] font-bold uppercase text-[#8b5a1f]">{item.priority}</span><span className="rounded-full bg-[#e7f1e7] px-2 py-1 text-[10px] font-bold capitalize text-[#397256]">{item.category}</span></div><p className="mt-2 text-xs leading-5 text-[#735f49]">{item.rationale}</p><p className="mt-2 text-xs font-bold text-[#5c7b61]">Next: {item.recommendedAction}</p></div>)}</div></div></section>}
        <section className={`overflow-hidden rounded-[24px] border border-[#e4e8e0] bg-[#fcfbf8] shadow-sm ${officerTab === "reports" ? "hidden" : ""}`}><div className="flex items-center justify-between border-b border-[#eceee8] px-5 py-4"><div><h2 className="font-display text-2xl font-semibold text-[#244b38]">Sign-in activity</h2><p className="mt-1 text-xs text-[#7d8a82]">OAuth sign-ins recorded after successful authentication.</p></div><Users size={20} className="text-[#5b8a67]" /></div><div className="divide-y divide-[#eff1ed]">{signIns.isLoading ? <LoadingRow /> : signIns.data?.length ? signIns.data.map(event => <div key={event.id} className="flex flex-col justify-between gap-2 px-5 py-4 sm:flex-row sm:items-center"><div><p className="text-sm font-semibold text-[#294836]">{event.userName || "Unnamed citizen"}</p><p className="mt-1 text-xs text-[#7d8a82]">{event.email || "No email provided"} · {event.loginMethod || "OAuth"}</p></div><div className="text-xs text-[#748178]">{formatDate(event.signedInAt)}</div></div>) : <EmptyRow label="No citizen sign-ins recorded yet" />}</div></section>
      </div>
    )}
  </DashboardLayout>;
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) { return <div className="rounded-[20px] border border-[#e4e8e0] bg-[#fcfbf8] p-5 shadow-sm"><div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-[0.1em] text-[#7b8b80]">{label}</span><span className="text-[#5b8a67]">{icon}</span></div><p className="mt-3 font-display text-4xl font-semibold text-[#1f4938]">{value}</p></div>; }
function LoadingRow() { return <div className="flex items-center gap-3 px-5 py-8 text-sm text-[#7d8a82]"><Loader2 size={16} className="animate-spin" /> Loading records…</div>; }
function EmptyRow({ label }: { label: string }) { return <div className="px-5 py-8 text-sm text-[#7d8a82]">{label}</div>; }
