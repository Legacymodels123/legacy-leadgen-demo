"use client";

import { useState } from "react";
import { useApp } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { CREDIT_COSTS, NIGHTLY_BATCH_LEADS } from "@/lib/types";

export default function BatchesPage() {
  const { batches, runNightlyBatch } = useApp();
  const { user } = useAuth();
  const [error, setError] = useState("");

  const batchCost = CREDIT_COSTS.nightlyBatch * NIGHTLY_BATCH_LEADS;

  function handleRunBatch() {
    setError("");
    const err = runNightlyBatch();
    if (err) setError(err);
  }

  return (
    <>
      <div className="topbar">
        <span className="topbar-title">Batches</span>
        <span className="topbar-sub">— AI nightly lead generatie</span>
        <div className="topbar-spacer" />
        <button
          className="btn-primary"
          type="button"
          onClick={handleRunBatch}
          disabled={!user || user.credits < batchCost}
        >
          ▶ Run batch ({batchCost} credits)
        </button>
      </div>
      <div className="page-scroll">
        <div className="card">
          <div className="card-title">Nightly AI Agent</div>
          <div className="card-desc">
            Genereert {NIGHTLY_BATCH_LEADS} nieuwe leads per batch. Kost{" "}
            {CREDIT_COSTS.nightlyBatch} credits per lead ({batchCost} credits totaal).
            Je hebt momenteel {user?.credits ?? 0} credits.
          </div>
          {error && <div className="form-error">{error}</div>}
        </div>

        <div className="card">
          <div className="card-title">Batch geschiedenis</div>
          <div className="card-desc">Alle gegenereerde nightly batches</div>
          <div className="batch-list">
            {batches.length === 0 && (
              <p style={{ fontSize: 13, color: "#bbb" }}>Nog geen batches uitgevoerd.</p>
            )}
            {batches.map((batch) => (
              <div key={batch.id} className="batch-item">
                <div className="batch-item-date">
                  {new Date(batch.date).toLocaleDateString("nl-NL", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </div>
                <div className="batch-item-meta">
                  {batch.label} · {batch.creditsUsed} credits gebruikt
                </div>
                <div className="batch-item-count">{batch.leadCount} leads</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
