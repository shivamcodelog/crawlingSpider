import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";

const FAKE_LINES = [
  { text: "$ shizuku8 --query \"Textile Industry in Surat\"", color: "text-success" },
  { text: "[INFO] Launching Chromium headless browser...", color: "text-muted" },
  { text: "[INFO] Navigating to Google Maps...", color: "text-muted" },
  { text: "[INFO] Scrolling feed to load listings...", color: "text-muted" },
  { text: "   Scroll 5: 48 listings loaded...", color: "text-textPrimary" },
  { text: "   Scroll 10: 96 listings loaded...", color: "text-textPrimary" },
  { text: "[INFO] Found 142 listing URLs. Extracting details...", color: "text-primary" },
  { text: "   [  1] OK  Shree Textile Mills                TEL  WEB", color: "text-success" },
  { text: "   [  2] OK  Gujarat Fabrics Pvt Ltd             TEL  ---", color: "text-success" },
  { text: "   [  3] OK  Surat Silk Emporium                TEL  WEB", color: "text-success" },
  { text: "   [  4] SKIP duplicate: Shree Textile Mills", color: "text-primary" },
  { text: "   [  5] OK  Diamond Textiles & Co              TEL  WEB", color: "text-success" },
  { text: "   [  6] OK  Mahavir Saree Palace               TEL  WEB", color: "text-success" },
  { text: "   [  7] OK  Radhe Krishna Fabrics              ---  WEB", color: "text-success" },
  { text: "         [Backup saved — 6 records so far]", color: "text-muted" },
  { text: "   [  8] OK  Jay Ambe Textiles                  TEL  WEB", color: "text-success" },
  { text: "   [  9] OK  Patel & Sons Fabrics               TEL  ---", color: "text-success" },
  { text: "   [ 10] OK  Surat Weaving Co-op               TEL  WEB", color: "text-success" },
  { text: "", color: "text-muted" },
  { text: "[DONE] Saved 142 records to Textile_Industry_Surat.xlsx", color: "text-primary" },
  { text: "[INFO] Data Quality: 89% Phone | 76% Website | 100% Coords", color: "text-success" },
  { text: "$ ▊", color: "text-success" },
];

export default function TerminalWindow() {
  const [visibleLines, setVisibleLines] = useState([]);
  const terminalRef = useRef(null);

  useEffect(() => {
    let idx = 0;
    const interval = setInterval(() => {
      if (idx < FAKE_LINES.length) {
        const currentLine = FAKE_LINES[idx]; // capture value before async state update
        idx++;
        setVisibleLines((prev) => [...prev, currentLine]);
      } else {
        // Reset and loop
        idx = 0;
        setVisibleLines([]);
      }
    }, 400);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [visibleLines]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay: 0.3 }}
      className="bg-[#0D0D0D] border border-border rounded overflow-hidden shadow-glow-lg"
    >
      {/* Terminal header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-[#1A1A1A] border-b border-border">
        <div className="w-3 h-3 rounded-full bg-error" />
        <div className="w-3 h-3 rounded-full bg-yellow-500" />
        <div className="w-3 h-3 rounded-full bg-success" />
        <span className="ml-3 font-mono text-xs text-muted">
          shizuku8 — scraping session
        </span>
      </div>

      {/* Terminal body */}
      <div
        ref={terminalRef}
        className="p-4 h-80 overflow-y-auto font-mono text-sm leading-relaxed"
      >
        {visibleLines.map((line, i) => (
          <div key={i} className={`${line.color} whitespace-pre`}>
            {line.text}
          </div>
        ))}
      </div>
    </motion.div>
  );
}
