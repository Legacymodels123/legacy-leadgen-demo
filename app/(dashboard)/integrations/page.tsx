"use client";

import { useAuth } from "@/lib/auth";
import { useApp } from "@/lib/store";
import type { Integrations } from "@/lib/types";

const INTEGRATIONS: {
  key: keyof Integrations;
  title: string;
  description: string;
}[] = [
  {
    key: "linkedin",
    title: "LinkedIn",
    description: "Koppel je LinkedIn account voor directe outreach",
  },
  {
    key: "crm",
    title: "CRM Export",
    description: "Synchroniseer leads naar HubSpot of Salesforce",
  },
  {
    key: "webhooks",
    title: "Webhooks",
    description: "Ontvang notificaties bij nieuwe batches",
  },
  {
    key: "nightlyAgent",
    title: "Nightly AI Agent",
    description: "Automatische lead generatie elke nacht om 02:00",
  },
];

export default function IntegrationsPage() {
  const { user } = useAuth();
  const { updateIntegrations } = useApp();

  if (!user) return null;

  function toggle(key: keyof Integrations) {
    updateIntegrations({
      ...user!.integrations,
      [key]: !user!.integrations[key],
    });
  }

  return (
    <>
      <div className="topbar">
        <span className="topbar-title">Integraties</span>
        <span className="topbar-sub">— Koppel externe tools</span>
      </div>
      <div className="page-scroll">
        <div className="card">
          <div className="card-title">Actieve integraties</div>
          <div className="card-desc">
            Schakel integraties in of uit. Instellingen worden lokaal opgeslagen.
          </div>
          {INTEGRATIONS.map((item) => (
            <div key={item.key} className="setting-row">
              <div className="setting-info">
                <h4>{item.title}</h4>
                <p>{item.description}</p>
              </div>
              <button
                type="button"
                className={`toggle${user.integrations[item.key] ? " on" : ""}`}
                onClick={() => toggle(item.key)}
                aria-label={`Toggle ${item.title}`}
              />
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-title">API Status</div>
          <div className="card-desc">Verbindingen met externe services</div>
          <div className="setting-row">
            <div className="setting-info">
              <h4>Lead Intelligence API</h4>
              <p>Intern — actief</p>
            </div>
            <span className="status-pill s-gewonnen">Online</span>
          </div>
          <div className="setting-row">
            <div className="setting-info">
              <h4>AI Agent Service</h4>
              <p>
                {user.integrations.nightlyAgent
                  ? "Gepland — volgende run 02:00"
                  : "Uitgeschakeld"}
              </p>
            </div>
            <span
              className={`status-pill ${user.integrations.nightlyAgent ? "s-gewonnen" : "s-verloren"}`}
            >
              {user.integrations.nightlyAgent ? "Actief" : "Inactief"}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
