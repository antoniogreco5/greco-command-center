"use client";
import { useState, useEffect, useCallback } from "react";

const fmt = (n) => !n ? "$0" : n >= 1e6 ? "$" + (n / 1e6).toFixed(1) + "M" : "$" + (n / 1e3).toFixed(0) + "K";
const typeColors = { Video: ["rgba(216,90,48,.12)","#F0997B"], Post: ["rgba(245,158,11,.12)","#FAC775"], Blog: ["rgba(120,75,209,.12)","#AFA9EC"], Email: ["rgba(29,158,117,.12)","#5DCAA5"], YouTube: ["rgba(239,68,68,.12)","#F09595"], "Youtube Series": ["rgba(239,68,68,.12)","#F09595"] };
const prioColors = { critical: { bg:"rgba(239,68,68,.08)", bd:"rgba(239,68,68,.3)", fg:"#F09595", icon:"🔴" }, high: { bg:"rgba(216,90,48,.08)", bd:"rgba(216,90,48,.3)", fg:"#F0997B", icon:"🟠" }, medium: { bg:"rgba(245,158,11,.08)", bd:"rgba(245,158,11,.25)", fg:"#FAC775", icon:"🟡" }, low: { bg:"rgba(46,122,158,.06)", bd:"rgba(46,122,158,.2)", fg:"#7BBDD4", icon:"🔵" } };
const catColors = { outreach:"#F0997B", data:"#AFA9EC", research:"#7BBDD4", content:"#FAC775", planning:"#5DCAA5" };

function Badge({ children, bg, fg }) {
  return <span style={{ display:"inline-block", padding:"2px 8px", borderRadius:6, fontSize:10, fontWeight:600, background:bg, color:fg, letterSpacing:.3 }}>{children}</span>;
}

function Card({ label, value, sub, color = "#7BBDD4" }) {
  return (
    <div style={{ background:"#12141B", border:"1px solid rgba(255,255,255,.05)", borderRadius:12, padding:"18px 20px", animation:"fadeIn .4s ease" }}>
      <div style={{ fontSize:11, color:"#6B7084", fontWeight:500, marginBottom:6, letterSpacing:.2 }}>{label}</div>
      <div style={{ fontSize:32, fontWeight:600, letterSpacing:-1, lineHeight:1, fontFamily:"'JetBrains Mono', monospace", color }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:"#525668", marginTop:6 }}>{sub}</div>}
    </div>
  );
}

function SH({ children, right }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14, marginTop:6 }}>
      <div style={{ fontSize:11, fontWeight:600, textTransform:"uppercase", letterSpacing:1.2, color:"#525668" }}>{children}</div>
      {right}
    </div>
  );
}

function Tab({ active, onClick, children }) {
  return <button onClick={onClick} style={{ padding:"8px 16px", borderRadius:8, border:"none", cursor:"pointer", fontSize:12, fontWeight:500, background:active?"rgba(46,122,158,.12)":"transparent", color:active?"#7BBDD4":"#525668", transition:"all .2s" }}>{children}</button>;
}

function OverviewView({ data, setView }) {
  const d = data.expired;
  const active = d.emailed + d.planToCall + d.texted;
  const emailPct = (d.emailed / d.total) * 100;
  const planPct = (d.planToCall / d.total) * 100;
  const untouchPct = (d.untouched / d.total) * 100;
  const hot = d.leads.filter(l => l.status === "Emailed");
  const warm = d.leads.filter(l => l.status === "Plan to Call");

  return (
    <>
      {/* Daily Tasks */}
      {data.tasks.length > 0 && (
        <>
          <SH>Your daily tasks — {new Date().toLocaleDateString("en-US",{weekday:"long"})}</SH>
          {data.tasks.map((t, i) => {
            const p = prioColors[t.priority] || prioColors.low;
            return (
              <div key={i} style={{ background:p.bg, border:`1px solid ${p.bd}`, borderLeft:`3px solid ${p.bd}`, borderRadius:10, padding:"14px 18px", marginBottom:6, animation:`fadeIn .3s ease ${i*.08}s both` }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span>{p.icon}</span>
                  <span style={{ fontSize:13, fontWeight:600, color:"#D0D3DD", flex:1 }}>{t.task}</span>
                  <Badge bg={`${catColors[t.category]}18`} fg={catColors[t.category]}>{t.category}</Badge>
                </div>
                <div style={{ fontSize:11, color:"#6B7084", marginTop:4, marginLeft:26 }}>{t.detail}</div>
              </div>
            );
          })}
          <div style={{ height:20 }} />
        </>
      )}

      {/* Opportunity Scope */}
      <SH>Opportunity scope — expired leads</SH>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:12 }}>
        <Card label="Total on board" value={d.total} sub="All expired & withdrawn" />
        <Card label="In active outreach" value={active} sub={`${d.emailed} emailed · ${d.planToCall} queued · ${d.texted} texted`} color="#5DCAA5" />
        <Card label="Untouched bench" value={d.untouched} sub="Ready for next outreach wave" color="#525668" />
      </div>
      {d.communicating > 0 && (
        <div style={{ background:"rgba(239,68,68,.08)", border:"1px solid rgba(239,68,68,.25)", borderRadius:10, padding:"14px 18px", marginBottom:12, display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:20 }}>🔴</span>
          <div>
            <div style={{ fontSize:14, fontWeight:700, color:"#F09595" }}>{d.communicating} LEAD(S) RESPONDING</div>
            <div style={{ fontSize:11, color:"#6B7084" }}>Open Monday.com → check Communicating status → call now</div>
          </div>
        </div>
      )}
      <div style={{ background:"#12141B", border:"1px solid rgba(255,255,255,.05)", borderRadius:12, padding:"14px 20px", marginBottom:28 }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
          <span style={{ fontSize:11, color:"#6B7084" }}>Board coverage</span>
          <span style={{ fontSize:11, color:"#6B7084", fontFamily:"'JetBrains Mono', monospace" }}>{d.total > 0 ? ((active / d.total) * 100).toFixed(1) : 0}% touched</span>
        </div>
        <div style={{ height:6, borderRadius:3, overflow:"hidden", display:"flex", gap:2 }}>
          <div style={{ height:"100%", width:`${emailPct}%`, background:"#2E7A9E", borderRadius:3, transition:"width .8s ease" }} />
          <div style={{ height:"100%", width:`${planPct}%`, background:"#F59E0B", borderRadius:3, transition:"width .8s ease" }} />
          <div style={{ height:"100%", width:`${untouchPct}%`, background:"#1E2130", borderRadius:3 }} />
        </div>
        <div style={{ display:"flex", gap:16, marginTop:8 }}>
          <span style={{ fontSize:10, color:"#2E7A9E" }}>● Emailed ({d.emailed})</span>
          <span style={{ fontSize:10, color:"#F59E0B" }}>● Queued ({d.planToCall})</span>
          <span style={{ fontSize:10, color:"#363A4A" }}>● Untouched ({d.untouched})</span>
          {d.communicating > 0 && <span style={{ fontSize:10, color:"#EF4444" }}>● Responding ({d.communicating})</span>}
        </div>
      </div>

      {/* FSBO */}
      <SH>FSBO tracking</SH>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:28 }}>
        <Card label="Active FSBOs" value={data.fsbo.active} sub="Listed for sale by owner" color="#F59E0B" />
        <Card label="Pending / Sold" value={data.fsbo.pending + data.fsbo.sold} sub={`${data.fsbo.pending} pending · ${data.fsbo.sold} sold`} color="#5DCAA5" />
        <Card label="Off market" value={data.fsbo.offMarket} sub="Removed listing" color="#525668" />
      </div>

      {/* Data Enrichment */}
      {d.enrichment && (
        <>
          <SH>Contact data enrichment</SH>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:28 }}>
            <Card label="Active leads with email" value={`${d.enrichment.withEmail}/${d.enrichment.totalActive}`} sub={`${d.enrichment.emailPct}% coverage`} color={d.enrichment.emailPct >= 80 ? "#5DCAA5" : "#FAC775"} />
            <Card label="Active leads with phone" value={`${d.enrichment.withPhone}/${d.enrichment.totalActive}`} sub="DNC-filtered numbers" color="#5DCAA5" />
            <Card label="Still need skip trace" value={d.enrichment.missingEmail} sub="No email found yet" color={d.enrichment.missingEmail > 0 ? "#525668" : "#5DCAA5"} />
          </div>
        </>
      )}

      {/* Active Leads Preview */}
      {hot.length > 0 && (
        <>
          <SH right={<Tab onClick={() => setView("leads")}>View all →</Tab>}>HOT leads — emailed</SH>
          {hot.slice(0, 5).map((l, i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", padding:"10px 14px", background:"#12141B", border:"1px solid rgba(255,255,255,.04)", borderRadius:8, marginBottom:4, gap:10, animation:`fadeIn .3s ease ${i*.05}s both` }}>
              <Badge bg="rgba(216,90,48,.12)" fg="#F0997B">HOT</Badge>
              <span style={{ fontSize:12, fontWeight:500, color:"#D0D3DD", flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{l.addr}</span>
              <span style={{ fontSize:12, fontWeight:600, color:"#8BA4B0", fontFamily:"'JetBrains Mono', monospace" }}>{fmt(l.price)}</span>
            </div>
          ))}
          <div style={{ height:16 }} />
        </>
      )}

      {/* Content Preview */}
      <SH right={<Tab onClick={() => setView("content")}>Full calendar →</Tab>}>Upcoming content</SH>
      {data.content.items.slice(0, 4).map((c, i) => {
        const [bg, fg] = typeColors[c.type] || typeColors.Post;
        return (
          <div key={i} style={{ display:"flex", alignItems:"center", padding:"8px 14px", background:"#12141B", border:"1px solid rgba(255,255,255,.04)", borderRadius:8, marginBottom:3, gap:10 }}>
            <Badge bg={bg} fg={fg}>{c.type}</Badge>
            <span style={{ fontSize:12, fontWeight:500, color:"#B0B3C1", flex:1 }}>{c.title}</span>
            {c.wip && <Badge bg="rgba(245,158,11,.12)" fg="#FAC775">WIP</Badge>}
            <span style={{ fontSize:11, color:"#525668", fontFamily:"'JetBrains Mono', monospace" }}>{c.due || "—"}</span>
          </div>
        );
      })}

      {/* AI Agent Teaser */}
      <div style={{ background:"rgba(255,255,255,.02)", border:"1px dashed rgba(255,255,255,.08)", borderRadius:12, padding:"28px 20px", textAlign:"center", marginTop:20 }}>
        <div style={{ fontSize:28, marginBottom:8, filter:"grayscale(1)", opacity:.4 }}>🤖</div>
        <div style={{ fontSize:13, color:"#3E4255", fontWeight:500 }}>AI Outreach Agent — Coming Soon</div>
        <div style={{ fontSize:11, color:"#2E3142", marginTop:4 }}>Auto-generate personalized emails, Loom scripts, and CMA triggers for new leads.</div>
      </div>
    </>
  );
}

function LeadsView({ data }) {
  const [show, setShow] = useState("active");
  const active = data.expired.leads;
  const relist = data.relistCheck || [];
  const skip = data.skipTraceNeeded || [];
  const list = show === "active" ? active : show === "relist" ? relist : skip;

  return (
    <>
      <SH right={
        <div style={{ display:"flex", gap:4 }}>
          <Tab active={show === "active"} onClick={() => setShow("active")}>Active ({active.length})</Tab>
          <Tab active={show === "relist"} onClick={() => setShow("relist")}>Relist Check ({relist.length})</Tab>
          <Tab active={show === "skip"} onClick={() => setShow("skip")}>Need Skip Trace ({skip.length})</Tab>
        </div>
      }>Lead pipeline</SH>
      {list.length === 0 && <div style={{ padding:40, textAlign:"center", color:"#525668", fontSize:13 }}>No leads in this view</div>}
      {list.map((l, i) => (
        <div key={i} style={{ display:"flex", alignItems:"center", padding:"10px 14px", background:"#12141B", border:"1px solid rgba(255,255,255,.04)", borderRadius:8, marginBottom:4, gap:10, animation:`fadeIn .2s ease ${i*.03}s both` }}>
          {show === "active" && <Badge bg={l.status === "Emailed" ? "rgba(46,122,158,.12)" : l.status === "Communicating" ? "rgba(34,197,94,.12)" : "rgba(245,158,11,.12)"} fg={l.status === "Emailed" ? "#7BBDD4" : l.status === "Communicating" ? "#5DCAA5" : "#FAC775"}>{l.status}</Badge>}
          {show === "relist" && <Badge bg="rgba(120,75,209,.12)" fg="#AFA9EC">{l.daysExpired}d ago</Badge>}
          {show === "skip" && <Badge bg="rgba(245,158,11,.12)" fg="#FAC775">NEED EMAIL</Badge>}
          <span style={{ fontSize:12, fontWeight:500, color:"#D0D3DD", flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{l.addr}</span>
          {show === "active" && (
            <div style={{ display:"flex", gap:4 }}>
              <span style={{ fontSize:10, color: l.hasEmail ? "#5DCAA5" : "#525668" }} title={l.hasEmail ? "Has email" : "No email"}>✉</span>
              <span style={{ fontSize:10, color: l.hasPhone ? "#5DCAA5" : "#525668" }} title={l.hasPhone ? "Has phone" : "No phone"}>☎</span>
            </div>
          )}
          {l.owner && <span style={{ fontSize:11, color:"#525668", maxWidth:120, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{l.owner}</span>}
          <span style={{ fontSize:12, fontWeight:600, color:"#8BA4B0", fontFamily:"'JetBrains Mono', monospace", minWidth:55, textAlign:"right" }}>{fmt(l.price)}</span>
        </div>
      ))}
    </>
  );
}

function ContentView({ data }) {
  return (
    <>
      <SH right={<span style={{ fontSize:11, color:"#6B7084" }}>{data.content.wip} in progress · {data.content.total - data.content.wip} queued</span>}>Content pipeline</SH>
      {data.content.items.map((c, i) => {
        const [bg, fg] = typeColors[c.type] || typeColors.Post;
        return (
          <div key={i} style={{ display:"flex", alignItems:"center", padding:"8px 14px", background:"#12141B", border:"1px solid rgba(255,255,255,.04)", borderRadius:8, marginBottom:3, gap:10, animation:`fadeIn .2s ease ${i*.03}s both` }}>
            <Badge bg={bg} fg={fg}>{c.type}</Badge>
            <span style={{ fontSize:12, fontWeight:500, color:"#B0B3C1", flex:1 }}>{c.title}</span>
            {c.wip && <Badge bg="rgba(245,158,11,.12)" fg="#FAC775">IN PROGRESS</Badge>}
            <span style={{ fontSize:11, color:"#525668", fontFamily:"'JetBrains Mono', monospace" }}>{c.due || "—"}</span>
          </div>
        );
      })}
    </>
  );
}

export default function Home() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState("overview");
  const [lastSync, setLastSync] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/monday", { cache: "no-store" });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
      setLastSync(new Date());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const today = new Date().toLocaleDateString("en-US", { weekday:"long", month:"long", day:"numeric", year:"numeric" });
  const active = data ? data.expired.emailed + data.expired.planToCall + data.expired.texted : 0;

  return (
    <div style={{ minHeight:"100vh" }}>
      <header style={{ padding:"20px 28px 16px", borderBottom:"1px solid rgba(255,255,255,.06)", display:"flex", justifyContent:"space-between", alignItems:"center", position:"sticky", top:0, background:"#0B0D11", zIndex:10, flexWrap:"wrap", gap:12 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:38, height:38, borderRadius:10, background:"linear-gradient(135deg,#2E7A9E,#1B4D62)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:17 }}>G</div>
          <div>
            <div style={{ fontSize:15, fontWeight:600, letterSpacing:-.3, color:"#fff" }}>Greco Command Center</div>
            <div style={{ fontSize:11, color:"#6B7084" }}>Executive Dashboard · Live</div>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ display:"flex", gap:3, background:"rgba(255,255,255,.03)", borderRadius:8, padding:3 }}>
            {[["overview","Overview"],["leads","Leads"],["content","Content"]].map(([id,label]) => (
              <Tab key={id} active={view === id} onClick={() => setView(id)}>{label}</Tab>
            ))}
          </div>
          <button onClick={refresh} disabled={loading} style={{ padding:"7px 14px", borderRadius:8, border:"1px solid rgba(46,122,158,.25)", background:"rgba(46,122,158,.08)", color:"#7BBDD4", fontSize:12, fontWeight:500, cursor:"pointer", display:"flex", alignItems:"center", gap:6, opacity:loading?.6:1 }}>
            <span style={{ display:"inline-block", animation: loading ? "spin .8s linear infinite" : "none", fontSize:14 }}>↻</span>
            {loading ? "Syncing..." : "Refresh"}
          </button>
          <span style={{ fontSize:11, color:"#6B7084", fontFamily:"'JetBrains Mono', monospace" }}>{today}</span>
        </div>
      </header>

      <main style={{ maxWidth:960, margin:"0 auto", padding:"24px 28px 60px" }}>
        {/* Error State */}
        {error && (
          <div style={{ background:"rgba(239,68,68,.08)", border:"1px solid rgba(239,68,68,.2)", borderRadius:12, padding:"16px 20px", marginBottom:20 }}>
            <div style={{ fontSize:13, fontWeight:600, color:"#F09595" }}>Connection error</div>
            <div style={{ fontSize:11, color:"#6B7084", marginTop:4 }}>{error}</div>
          </div>
        )}

        {/* Loading State */}
        {loading && !data && (
          <div style={{ textAlign:"center", padding:80 }}>
            <div style={{ fontSize:32, animation:"spin 1s linear infinite", display:"inline-block", marginBottom:16 }}>↻</div>
            <div style={{ fontSize:14, color:"#6B7084" }}>Connecting to Monday.com...</div>
            <div style={{ fontSize:11, color:"#525668", marginTop:4 }}>Pulling Expired, FSBO, and Content boards</div>
          </div>
        )}

        {data && (
          <>
            {/* Pulse Bar */}
            <div style={{ background:"rgba(46,122,158,.08)", border:"1px solid rgba(46,122,158,.15)", borderRadius:12, padding:"14px 20px", marginBottom:24, display:"flex", alignItems:"center", gap:8, fontSize:13, color:"#8BA4B0", flexWrap:"wrap" }}>
              <span style={{ fontWeight:600, color:"#C2DBE6", fontFamily:"'JetBrains Mono', monospace" }}>{active}</span> leads in outreach
              <span style={{ color:"#363A4A" }}>·</span>
              <span style={{ fontWeight:600, color:"#C2DBE6", fontFamily:"'JetBrains Mono', monospace" }}>{data.fsbo.active}</span> FSBOs tracked
              <span style={{ color:"#363A4A" }}>·</span>
              <span style={{ fontWeight:600, color:"#C2DBE6", fontFamily:"'JetBrains Mono', monospace" }}>{data.content.total}</span> content queued
              {data.expired.communicating > 0
                ? <span style={{ marginLeft:"auto", background:"rgba(239,68,68,.1)", border:"1px solid rgba(239,68,68,.2)", borderRadius:8, padding:"4px 10px", fontSize:11, fontWeight:600, color:"#F09595" }}>‼ {data.expired.communicating} RESPONDING</span>
                : <span style={{ marginLeft:"auto", background:"rgba(34,197,94,.08)", border:"1px solid rgba(34,197,94,.15)", borderRadius:8, padding:"4px 10px", fontSize:11, fontWeight:600, color:"#5DCAA5" }}>VA outreach active</span>
              }
            </div>

            {lastSync && (
              <div style={{ fontSize:10, color:"#3E4255", textAlign:"right", marginTop:-18, marginBottom:16, fontFamily:"'JetBrains Mono', monospace" }}>
                Last sync: {lastSync.toLocaleTimeString()}
              </div>
            )}

            {view === "overview" && <OverviewView data={data} setView={setView} />}
            {view === "leads" && <LeadsView data={data} />}
            {view === "content" && <ContentView data={data} />}
          </>
        )}
      </main>
    </div>
  );
}
