"use client";

import { useEffect, useState } from "react";

/** Development-only, opt-in checks; this module is never rendered in production. */
export function AccessibilityAudit() {
  const [enabled, setEnabled] = useState(false);
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState("");
  useEffect(() => { queueMicrotask(() => setEnabled(new URLSearchParams(window.location.search).get("a11y") === "1")); }, []);
  async function run() {
    setRunning(true); setReport("");
    try {
      const axe = (await import("axe-core")).default;
      const result = await axe.run({ exclude: [["#accessibility-audit"]] }, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"] } });
      setReport(JSON.stringify({ violations: result.violations.map(item => ({ id: item.id, impact: item.impact, description: item.description, nodes: item.nodes.map(node => ({ target: node.target, summary: node.failureSummary })) })), manualReview: result.incomplete.map(item => ({ id: item.id, targets: item.nodes.map(node => node.target) })), passes: result.passes.length }, null, 2));
    } catch (error) { setReport(error instanceof Error ? error.message : "Audit could not run."); }
    finally { setRunning(false); }
  }
  if (!enabled) return null;
  return <aside id="accessibility-audit" aria-label="Development accessibility audit" style={{ padding: 20, margin: 20, background: "#fff", color: "#18251f", border: "1px solid #78887b" }}>
    <button type="button" className="btn-ghost" disabled={running} onClick={() => void run()}>{running ? "Running accessibility audit…" : "Run accessibility audit"}</button>
    <p role="status">{report ? "Audit complete. Review the report and perform keyboard and screen-reader checks." : "Development check only. Automated checks do not establish full accessibility conformance."}</p>
    {report && <pre id="accessibility-audit-report" style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontSize: 12, marginTop: 16 }}>{report}</pre>}
  </aside>;
}
