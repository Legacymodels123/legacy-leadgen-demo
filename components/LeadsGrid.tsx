"use client";

import type { Lead, LeadStatus } from "@/lib/types";
import { FLAGS, STATUS_LABELS, scoreColor } from "@/lib/utils";

const STATUSES: LeadStatus[] = [
  "nieuw",
  "bekeken",
  "verstuurd",
  "opvolgen",
  "gewonnen",
  "verloren",
];

interface Props {
  leads: Lead[];
  selectedId: string | null;
  selectedIds: Set<string>;
  onSelectRow: (id: string) => void;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: (ids: string[]) => void;
  onUpdate: (id: string, updates: Partial<Lead>) => void;
  onAddRow: () => void;
  onCopyMessage: (id: string) => void;
}

export default function LeadsGrid({
  leads,
  selectedId,
  selectedIds,
  onSelectRow,
  onToggleSelect,
  onToggleSelectAll,
  onUpdate,
  onAddRow,
  onCopyMessage,
}: Props) {
  const allSelected = leads.length > 0 && leads.every((l) => selectedIds.has(l.id));

  return (
    <div className="table-wrap">
      <table className="leads-grid">
        <thead>
          <tr>
            <th className="grid-check-col">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() => onToggleSelectAll(leads.map((l) => l.id))}
                aria-label="Selecteer alles"
              />
            </th>
            <th>Bedrijf</th>
            <th>Contact</th>
            <th>Functie</th>
            <th>Sector</th>
            <th>Fit score</th>
            <th>Status</th>
            <th>Acties</th>
          </tr>
        </thead>
        <tbody>
          {leads.length === 0 && (
            <tr>
              <td colSpan={8} className="grid-empty">
                Geen leads gevonden — voeg een rij toe
              </td>
            </tr>
          )}
          {leads.map((lead) => {
            const score = lead.score ?? 0;
            const color = scoreColor(score);
            return (
              <tr
                key={lead.id}
                className={`grid-row${selectedId === lead.id ? " selected" : ""}${
                  selectedIds.has(lead.id) ? " checked" : ""
                }`}
              >
                <td className="grid-check-col" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(lead.id)}
                    onChange={() => onToggleSelect(lead.id)}
                    aria-label={`Selecteer ${lead.company}`}
                  />
                </td>
                <td onClick={() => onSelectRow(lead.id)}>
                  <div className="company-cell">
                    <div className="company-flag">{FLAGS[lead.country] ?? "🌍"}</div>
                    <input
                      className="grid-input grid-input-bold"
                      value={lead.company}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => onUpdate(lead.id, { company: e.target.value })}
                    />
                  </div>
                </td>
                <td onClick={() => onSelectRow(lead.id)}>
                  <input
                    className="grid-input"
                    value={lead.contactName}
                    placeholder="Contactpersoon"
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => onUpdate(lead.id, { contactName: e.target.value })}
                  />
                </td>
                <td onClick={() => onSelectRow(lead.id)}>
                  <input
                    className="grid-input"
                    value={lead.contactTitle}
                    placeholder="Functie"
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => onUpdate(lead.id, { contactTitle: e.target.value })}
                  />
                </td>
                <td onClick={() => onSelectRow(lead.id)}>
                  <input
                    className="grid-input"
                    value={lead.sector}
                    placeholder="Sector"
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => onUpdate(lead.id, { sector: e.target.value })}
                  />
                </td>
                <td onClick={() => onSelectRow(lead.id)}>
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
                <td onClick={(e) => e.stopPropagation()}>
                  <select
                    className="grid-select"
                    value={lead.status}
                    onChange={(e) =>
                      onUpdate(lead.id, { status: e.target.value as LeadStatus })
                    }
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </td>
                <td onClick={(e) => e.stopPropagation()}>
                  <div className="actions-cell">
                    <button
                      type="button"
                      className="action-btn"
                      onClick={() => onCopyMessage(lead.id)}
                    >
                      Kopieer
                    </button>
                    {lead.linkedinUrl && (
                      <a
                        className="action-btn linkedin"
                        href={lead.linkedinUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        in
                      </a>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <button type="button" className="grid-add-row" onClick={onAddRow}>
        + Nieuwe rij
      </button>
    </div>
  );
}
