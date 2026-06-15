"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import type { LeadStatus } from "@/lib/types";
import { FLAGS, STATUS_CLASS, STATUS_LABELS, scoreColor } from "@/lib/utils";
import LeadDetailPanel from "@/components/LeadDetailPanel";
import AddLeadModal from "@/components/AddLeadModal";

type Filter = LeadStatus | "alle";

export default function LeadsPage() {
  const { leads, showToast } = useApp();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<Filter>("alle");
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  const filtered = useMemo(() => {
    return leads.filter((p) => {
      const ms = statusFilter === "alle" || p.status === statusFilter;
      const mq =
        !search ||
        p.company.toLowerCase().includes(search.toLowerCase()) ||
        p.contactName.toLowerCase().includes(search.toLowerCase());
      return ms && mq;
    });
  }, [leads, statusFilter, search]);

  const selected = leads.find((p) => p.id === selectedId);

  const stats = useMemo(() => {
    const total = leads.length;
    const nieuw = leads.filter((p) => p.status === "nieuw").length;
    const verstuurd = leads.filter((p) => p.status === "verstuurd").length;
    const opvolgen = leads.filter((p) => p.status === "opvolgen").length;
    const gewonnen = leads.filter((p) => p.status === "gewonnen").length;
    const verloren = leads.filter((p) => p.status === "verloren").length;
    const bekeken = leads.filter((p) => p.status === "bekeken").length;
    const newBatch = leads.filter((p) => p.isNew).length;
    const conv = total ? Math.round((gewonnen / total) * 100) : 0;
    const maxFunnel = Math.max(nieuw + 3, verstuurd + 2, opvolgen + 1, gewonnen, 1);
    const funnelH = (n: number) => Math.max(8, Math.round((n / maxFunnel) * 36));
    const latestBatch = leads.find((p) => p.isNew)?.batch ?? leads[0]?.batch;
    return {
      total,
      nieuw,
      verstuurd,
      opvolgen,
      gewonnen,
      verloren,
      bekeken,
      newBatch,
      conv,
      funnelH,
      latestBatch,
    };
  }, [leads]);

  function copyMsg(id: string) {
    const p = leads.find((x) => x.id === id);
    if (!p) return;
    navigator.clipboard.writeText(p.message);
    showToast("Bericht gekopieerd!");
  }

  const funnelStages = [
    { label: "Nieuw", n: stats.nieuw, cls: "s1" },
    { label: "Bekeken", n: stats.bekeken, cls: "s2" },
    { label: "Verstuurd", n: stats.verstuurd, cls: "s3" },
    { label: "Opvolgen", n: stats.opvolgen, cls: "s4" },
    { label: "Gewonnen", n: stats.gewonnen, cls: "s4" },
    { label: "Verloren", n: stats.verloren, cls: "s5" },
  ];

  return (
    <>
      <div className="topbar">
        <span className="topbar-title">Lead Intelligence</span>
        <span className="topbar-sub">— Legacy Scale Models</span>
        <div className="topbar-spacer" />
        <div className="search-box">
          <span className="search-icon">⌕</span>
          <input
            type="text"
            placeholder="Zoek bedrijf of contact..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="btn-primary" type="button" onClick={() => setShowAddModal(true)}>
          + Voeg lead toe
        </button>
      </div>

      <div className="content">
        <div className="stats-bar">
          <div className="stat-card">
            <div className="stat-label">Totaal leads</div>
            <div className="stat-value">{stats.total}</div>
            <div className="stat-delta">10 per nacht toegevoegd</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Nieuw</div>
            <div className="stat-value red">{stats.nieuw}</div>
            <div className="stat-delta">Nog te beoordelen</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Op te volgen</div>
            <div className="stat-value orange">{stats.opvolgen}</div>
            <div className="stat-delta">Actie vereist</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Conversie</div>
            <div className="stat-value green">{stats.conv}%</div>
            <div className="stat-delta">
              {stats.gewonnen} van {stats.total} gewonnen
            </div>
          </div>
          <div className="funnel-card">
            <div className="funnel-label">Pipeline funnel</div>
            <div className="funnel-stages">
              {funnelStages.map((stage) => (
                <div key={stage.label} className="funnel-stage">
                  <div className="funnel-stage-num">{stage.n}</div>
                  <div
                    className={`funnel-bar ${stage.cls}`}
                    style={{ height: stats.funnelH(stage.n) }}
                  />
                  <div className="funnel-stage-label">{stage.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {stats.newBatch > 0 && (
          <div className="batch-banner">
            <div className="batch-dot" />
            <div className="batch-text">
              <strong>
                Nightly batch —{" "}
                {stats.latestBatch
                  ? new Date(stats.latestBatch).toLocaleDateString("nl-NL", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : "vandaag"}
              </strong>
              &nbsp;·&nbsp; Automatisch gegenereerd door de AI agent
            </div>
            <div className="batch-count">{stats.newBatch} nieuwe leads</div>
          </div>
        )}

        <div className="filter-bar">
          {(["alle", "nieuw", "bekeken", "verstuurd", "opvolgen", "gewonnen", "verloren"] as Filter[]).map(
            (s) => (
              <button
                key={s}
                type="button"
                className={`filter-pill${statusFilter === s ? " active" : ""}`}
                onClick={() => setStatusFilter(s)}
              >
                {s === "alle" ? "Alle leads" : STATUS_LABELS[s]}
              </button>
            )
          )}
          <div className="filter-sep" />
          <button
            type="button"
            className="filter-pill"
            onClick={() => setStatusFilter("nieuw")}
          >
            🌙 Nieuwe batch
          </button>
        </div>

        <div className="table-area">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Bedrijf</th>
                  <th>Contact</th>
                  <th>Fit score</th>
                  <th>Status</th>
                  <th>Batch</th>
                  <th>Acties</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: 32, color: "#bbb", fontSize: 13 }}>
                      Geen leads gevonden
                    </td>
                  </tr>
                )}
                {filtered.map((p) => {
                  const score = p.score ?? 0;
                  const color = scoreColor(score);
                  return (
                    <tr
                      key={p.id}
                      className={selectedId === p.id ? "selected" : ""}
                      onClick={() => setSelectedId(p.id)}
                    >
                      <td>
                        <div className="company-cell">
                          <div className="company-flag">{FLAGS[p.country] ?? "🌍"}</div>
                          <div>
                            <div className="company-name">{p.company}</div>
                            <div className="company-meta">
                              {p.country} · {p.employees.toLocaleString("nl-NL")} mw · {p.revenue}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="contact-name">{p.contactName}</div>
                        <div className="contact-title">{p.contactTitle}</div>
                      </td>
                      <td>
                        <div className="score-wrap">
                          <div className="score-bar-bg">
                            <div
                              className="score-bar"
                              style={{ width: `${score}%`, background: color }}
                            />
                          </div>
                          <span className="score-num" style={{ color }}>
                            {score}%
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className={`status-pill ${STATUS_CLASS[p.status]}`}>
                          {STATUS_LABELS[p.status]}
                        </span>
                      </td>
                      <td>
                        <span className={`batch-badge${p.isNew ? " new-batch" : ""}`}>
                          {p.isNew ? "Nieuw" : p.batch}
                        </span>
                      </td>
                      <td>
                        <div className="actions-cell">
                          <button
                            type="button"
                            className="action-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              copyMsg(p.id);
                            }}
                          >
                            Kopieer
                          </button>
                          <a
                            className="action-btn linkedin"
                            href={p.linkedinUrl}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            in
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={{ fontSize: 11, color: "#bbb", marginTop: 8, padding: "0 2px" }}>
              {filtered.length} van {leads.length} leads
            </div>
          </div>

          {selected && (
            <LeadDetailPanel lead={selected} onClose={() => setSelectedId(null)} />
          )}
        </div>
      </div>

      {showAddModal && <AddLeadModal onClose={() => setShowAddModal(false)} />}
    </>
  );
}
