import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";

const TERMINAL_LINES = [
  { text: '$ shizuku8 --query "restaurants in delhi" --limit 50', color: "#e8e8e8" },
  { text: "[init] launching chromium headless...", color: "#333" },
  { text: "[info] navigating to google maps...", color: "#333" },
  { text: "[info] found 73 listing urls", color: "#60a5fa" },
  { text: "[ 1] OK  Bukhara — ITC Maurya              TEL  WEB", color: "#4ade80" },
  { text: "[ 2] OK  Indian Accent                     TEL  WEB", color: "#4ade80" },
  { text: "[ 3] OK  Karim's Jama Masjid               TEL  ---", color: "#4ade80" },
  { text: "[ 4] SKIP  duplicate: Karim's", color: "#f59e0b" },
  { text: "[ 5] OK  Moti Mahal Delux                  TEL  WEB", color: "#4ade80" },
  { text: "     [backup saved — 5 records so far]", color: "#222" },
  { text: "[ 6] OK  Paranthe Wali Gali                TEL  ---", color: "#4ade80" },
  { text: "[done] 50 records → restaurants_delhi.xlsx", color: "#60a5fa" },
  { text: "[info] 88% phone | 72% website | 100% coords", color: "#4ade80" },
  { text: "$", color: "#333" },
];

const SpiderIcon = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
    <circle cx="14" cy="14" r="4" fill="#e8e8e8"/>
    <line x1="14" y1="10" x2="14" y2="2" stroke="#555" strokeWidth="1"/>
    <line x1="14" y1="18" x2="14" y2="26" stroke="#555" strokeWidth="1"/>
    <line x1="10" y1="14" x2="2" y2="14" stroke="#555" strokeWidth="1"/>
    <line x1="18" y1="14" x2="26" y2="14" stroke="#555" strokeWidth="1"/>
    <line x1="11.2" y1="11.2" x2="5.5" y2="5.5" stroke="#444" strokeWidth="1"/>
    <line x1="16.8" y1="16.8" x2="22.5" y2="22.5" stroke="#444" strokeWidth="1"/>
    <line x1="16.8" y1="11.2" x2="22.5" y2="5.5" stroke="#444" strokeWidth="1"/>
    <line x1="11.2" y1="16.8" x2="5.5" y2="22.5" stroke="#444" strokeWidth="1"/>
  </svg>
);

const SpiderWebBg = () => (
  <svg
    style={{ position:"absolute", top:"-20px", left:"50%", transform:"translateX(-50%)", opacity:0.035, pointerEvents:"none", zIndex:0 }}
    width="600" height="400" viewBox="0 0 600 400"
  >
    <g stroke="#fff" strokeWidth="0.5" fill="none">
      <line x1="300" y1="200" x2="300" y2="0"/>
      <line x1="300" y1="200" x2="300" y2="400"/>
      <line x1="300" y1="200" x2="0" y2="200"/>
      <line x1="300" y1="200" x2="600" y2="200"/>
      <line x1="300" y1="200" x2="100" y2="0"/>
      <line x1="300" y1="200" x2="500" y2="400"/>
      <line x1="300" y1="200" x2="500" y2="0"/>
      <line x1="300" y1="200" x2="100" y2="400"/>
      <ellipse cx="300" cy="200" rx="80" ry="50"/>
      <ellipse cx="300" cy="200" rx="160" ry="100"/>
      <ellipse cx="300" cy="200" rx="240" ry="150"/>
      <ellipse cx="300" cy="200" rx="300" ry="190"/>
    </g>
  </svg>
);

const FEATURES = [
  { icon: "◈", title: "two-stage extraction", desc: "Collects all listing HREFs first, then navigates each URL individually. No stale handles, no missed data." },
  { icon: "◇", title: "deduplication engine", desc: "Name + phone fingerprinting eliminates duplicates across multiple queries automatically." },
  { icon: "▣", title: "excel export", desc: "Auto-formatted .xlsx with proper column widths. Phone, address, coordinates, website — all fields." },
  { icon: "⟳", title: "real-time logs", desc: "Live terminal output as the scraper runs. Every record, every skip, every save — visible in real time." },
  { icon: "◎", title: "job queue", desc: "Background job processing with credit deduction, cancellation, and automatic retry on failure." },
  { icon: "△", title: "playwright core", desc: "Headless Chromium handles dynamic JS, infinite scroll, and anti-bot measures that break simple scrapers." },
];

const STEPS = [
  "sign in with google",
  "enter search query",
  "choose record count",
  "download excel file",
];

const mono = { fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace" };

export default function Landing() {
  const [termLines, setTermLines] = useState([]);
  const termRef = useRef(null);
  const idxRef = useRef(0);

  useEffect(() => {
    let isActive = true;
    let timeout;
    const tick = () => {
      if (idxRef.current >= TERMINAL_LINES.length) {
        idxRef.current = 0;
        if (isActive) setTermLines([]);
        timeout = setTimeout(tick, 800);
        return;
      }

      const nextLine = TERMINAL_LINES[idxRef.current];
      if (!nextLine) {
        idxRef.current = 0;
        if (isActive) setTermLines([]);
        timeout = setTimeout(tick, 800);
        return;
      }

      if (isActive) setTermLines((prev) => [...prev, nextLine]);
      idxRef.current++;
      timeout = setTimeout(tick, idxRef.current < TERMINAL_LINES.length ? 380 : 2500);
    };
    timeout = setTimeout(tick, 600);

    return () => {
      isActive = false;
      clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    if (termRef.current) termRef.current.scrollTop = termRef.current.scrollHeight;
  }, [termLines]);

  return (
    <div className="landing-root" style={{ background: "#080808", color: "#e8e8e8", minHeight: "100vh", ...mono }}>
      {/* NAV */}
      <nav className="landing-nav" style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"20px 40px", borderBottom:"0.5px solid #1a1a1a" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"10px", fontSize:"18px", fontWeight:700, color:"#fff", letterSpacing:"-0.5px" }} className="cursor-target">
          <SpiderIcon />
          Shizuku<span style={{ color:"#555", fontWeight:300 }}>8</span>
        </div>
        <div className="nav-links" style={{ display:"flex", gap:"32px", alignItems:"center" }}>
          <a href="https://github.com" style={{ color:"#555", fontSize:"13px", textDecoration:"none", letterSpacing:"0.5px" }} className="cursor-target">github</a>
          <Link to="/login" style={{ background:"#fff", color:"#000", padding:"8px 20px", borderRadius:"4px", fontSize:"12px", fontWeight:700, letterSpacing:"1px", textDecoration:"none", textTransform:"uppercase" }} className="cursor-target">
            get started
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero-section" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"60px", padding:"80px 40px 60px", alignItems:"center", position:"relative", overflow:"hidden" }}>
        <div className="hero-bg-eight" style={{ position:"absolute", right:"-40px", top:"50%", transform:"translateY(-50%)", fontSize:"320px", fontWeight:700, color:"#0d0d0d", lineHeight:1, pointerEvents:"none", zIndex:0, userSelect:"none" }}>8</div>
        <div className="hero-content" style={{ position:"relative", zIndex:1 }}>
          <div style={{ fontSize:"11px", letterSpacing:"3px", color:"#444", textTransform:"uppercase", marginBottom:"20px" }}>// web scraping infrastructure</div>
          <h1 style={{ fontSize:"clamp(36px,5vw,56px)", fontWeight:700, lineHeight:1.05, letterSpacing:"-2px", color:"#fff", margin:"0 0 8px" }}>
            Extract.<br />
            At<span style={{ color:"#2a2a2a" }}> any</span><br />
            scale.
          </h1>
          <p className="hero-copy" style={{ fontSize:"13px", color:"#555", lineHeight:1.8, margin:"24px 0 40px", maxWidth:"400px", fontWeight:300, letterSpacing:"0.3px" }}>
            Google Maps data extraction built for developers. Playwright-powered, dedup-safe, Excel-ready. The web is the target — we're the troupe.
          </p>
          <div className="hero-cta" style={{ display:"flex", gap:"12px", alignItems:"center" }}>
            <Link to="/login" style={{ background:"#fff", color:"#000", padding:"11px 24px", borderRadius:"4px", fontSize:"12px", fontWeight:700, letterSpacing:"1.5px", textTransform:"uppercase", textDecoration:"none" }} className="cursor-target">
              start scraping
            </Link>
            <a href="https://github.com" style={{ color:"#333", fontSize:"12px", letterSpacing:"0.5px", border:"0.5px solid #1e1e1e", padding:"11px 24px", borderRadius:"4px", textDecoration:"none" }} className="cursor-target">
              view on github
            </a>
          </div>
          <div style={{ fontSize:"10px", color:"#2a2a2a", letterSpacing:"2px", marginTop:"20px" }}>// member 08 — phantom troupe</div>
        </div>

        {/* TERMINAL */}
        <div className="terminal-panel" style={{ background:"#0a0a0a", border:"0.5px solid #1a1a1a", borderRadius:"8px", overflow:"hidden", position:"relative", zIndex:1 }}>
          <div style={{ background:"#111", padding:"10px 14px", display:"flex", alignItems:"center", gap:"6px", borderBottom:"0.5px solid #1a1a1a" }}>
            <div style={{ width:10, height:10, borderRadius:"50%", background:"#2a2a2a" }} />
            <div style={{ width:10, height:10, borderRadius:"50%", background:"#2a2a2a" }} />
            <div style={{ width:10, height:10, borderRadius:"50%", background:"#2a2a2a" }} />
            <span style={{ marginLeft:8, fontSize:11, color:"#333", letterSpacing:"0.5px" }}>shizuku8 — live session</span>
          </div>
          <div className="terminal-body" ref={termRef} style={{ padding:"16px", minHeight:"220px", maxHeight:"260px", overflowY:"auto", fontSize:"11px", lineHeight:1.7 }}>
            {termLines.map((l, i) => (
              l ? (
                <div key={i} style={{ color: l.color || "#e8e8e8", whiteSpace:"pre" }}>{l.text || ""}</div>
              ) : null
            ))}
            <span style={{ display:"inline-block", width:8, height:14, background:"#e8e8e8", animation:"blink 1s step-end infinite", verticalAlign:"text-bottom" }} />
          </div>
        </div>
      </section>

      <hr style={{ border:"none", borderTop:"0.5px solid #111", margin:0 }} />

      {/* FEATURES */}
      <section className="features-section" style={{ padding:"60px 40px", position:"relative", overflow:"hidden" }}>
        <SpiderWebBg />
        <div style={{ fontSize:"10px", letterSpacing:"4px", color:"#2a2a2a", textTransform:"uppercase", marginBottom:"48px" }}>// capabilities</div>
        <div className="features-grid" style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"1px", background:"#111", border:"0.5px solid #111", borderRadius:"8px", overflow:"hidden", position:"relative", zIndex:1 }}>
          {FEATURES.map(f => (
            <div key={f.title} className="feature-card cursor-target" style={{ background:"#080808", padding:"32px 28px" }}>
              <div style={{ fontSize:"20px", marginBottom:"16px", opacity:0.5 }}>{f.icon}</div>
              <div style={{ fontSize:"13px", fontWeight:700, color:"#e8e8e8", marginBottom:"8px", letterSpacing:"0.3px" }}>{f.title}</div>
              <div style={{ fontSize:"12px", color:"#3a3a3a", lineHeight:1.7, fontWeight:300 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <hr style={{ border:"none", borderTop:"0.5px solid #111", margin:0 }} />

      {/* HOW IT WORKS */}
      <section className="steps-section" style={{ padding:"60px 40px" }}>
        <div style={{ fontSize:"10px", letterSpacing:"4px", color:"#2a2a2a", textTransform:"uppercase", marginBottom:"48px" }}>// how it works</div>
        <div className="steps-grid" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:0, position:"relative" }}>
          <div className="steps-line" style={{ position:"absolute", top:16, left:"12.5%", right:"12.5%", height:"0.5px", background:"#1a1a1a" }} />
          {STEPS.map((s, i) => (
            <div key={i} className="step-item" style={{ textAlign:"center", padding:"0 16px", position:"relative", zIndex:1 }}>
              <div style={{ width:32, height:32, borderRadius:"50%", background:"#0e0e0e", border:"0.5px solid #1e1e1e", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"11px", color:"#333", margin:"0 auto 16px" }}>
                0{i+1}
              </div>
              <div style={{ fontSize:"12px", color:"#444", lineHeight:1.6, fontWeight:300 }}>{s}</div>
            </div>
          ))}
        </div>
      </section>

      <hr style={{ border:"none", borderTop:"0.5px solid #111", margin:0 }} />

      {/* FOOTER */}
      <footer className="landing-footer" style={{ padding:"32px 40px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ fontSize:"14px", fontWeight:700, color:"#222", letterSpacing:"-0.5px" }}>
          Shizuku<span style={{ color:"#1a1a1a" }}>8</span>
        </div>
        <div style={{ fontSize:"11px", color:"#1e1e1e", letterSpacing:"0.5px" }}>// built with precision — member 08</div>
      </footer>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;700&display=swap');
        @keyframes blink { 50% { opacity: 0; } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #080808; }
        ::-webkit-scrollbar-thumb { background: #1a1a1a; }

        .landing-root {
          overflow-x: hidden;
        }

        @media (max-width: 1024px) {
          .landing-nav,
          .hero-section,
          .features-section,
          .steps-section,
          .landing-footer {
            padding-left: 24px !important;
            padding-right: 24px !important;
          }

          .hero-section {
            grid-template-columns: 1fr !important;
            gap: 28px !important;
            padding-top: 56px !important;
          }

          .hero-bg-eight {
            font-size: 220px !important;
            right: -28px !important;
            top: 0 !important;
            transform: none !important;
          }

          .features-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          .steps-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            row-gap: 28px !important;
            column-gap: 16px !important;
          }

          .steps-line {
            display: none;
          }
        }

        @media (max-width: 640px) {
          .landing-nav {
            align-items: flex-start !important;
            flex-direction: column !important;
            gap: 14px !important;
            padding-top: 16px !important;
            padding-bottom: 16px !important;
          }

          .nav-links {
            width: 100% !important;
            justify-content: space-between !important;
            gap: 12px !important;
          }

          .hero-section,
          .features-section,
          .steps-section {
            padding-top: 40px !important;
            padding-bottom: 40px !important;
          }

          .hero-bg-eight {
            display: none;
          }

          .hero-content h1 {
            font-size: clamp(32px, 12vw, 42px) !important;
            letter-spacing: -1.2px !important;
          }

          .hero-copy {
            max-width: 100% !important;
            margin-bottom: 28px !important;
          }

          .hero-cta {
            flex-direction: column !important;
            align-items: stretch !important;
          }

          .hero-cta a {
            text-align: center;
            width: 100%;
          }

          .terminal-panel {
            margin-top: 4px;
          }

          .terminal-body {
            min-height: 180px !important;
            max-height: 220px !important;
            font-size: 10px !important;
          }

          .features-grid {
            grid-template-columns: 1fr !important;
          }

          .feature-card {
            padding: 24px 18px !important;
          }

          .steps-grid {
            grid-template-columns: 1fr !important;
            row-gap: 20px !important;
          }

          .step-item {
            text-align: left !important;
            display: flex !important;
            align-items: center !important;
            gap: 14px !important;
            padding: 0 !important;
          }

          .step-item > div:first-child {
            margin: 0 !important;
            flex-shrink: 0;
          }

          .landing-footer {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 8px !important;
            padding-top: 20px !important;
            padding-bottom: 24px !important;
          }
        }
      `}</style>
    </div>
  );
}
