"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useApp } from "@/lib/store";
import { fetchServiceStatus } from "@/lib/data/leads-client";
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
  const { updateIntegrations, storageMode } = useApp();
  const [serviceStatus, setServiceStatus] = useState({
    cloud: false,
    ai: false,
    supabasePublic: false,
  });

  useEffect(() => {
    fetchServiceStatus().then(setServiceStatus).catch(() => {});
  }, []);

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
          <div className="card-title">Systeemstatus</div>
          <div className="card-desc">
            Server-side configuratie (geen geheimen getoond). Client opslag:{" "}
            {storageMode === "cloud"
              ? "☁️ Cloud"
              : storageMode === "local"
                ? "💾 Lokaal"
                : "…"}
          </div>
          <div className="setting-row">
            <div className="setting-info">
              <h4>Supabase Cloud</h4>
              <p>Database sync voor leads en batches</p>
            </div>
            <span
              className={`status-pill ${serviceStatus.cloud ? "s-gewonnen" : "s-verloren"}`}
            >
              {serviceStatus.cloud ? "Geconfigureerd" : "Niet actief"}
            </span>
          </div>
          <div className="setting-row">
            <div className="setting-info">
              <h4>Claude AI</h4>
              <p>AI kolommen, batch research, lead verrijking</p>
            </div>
            <span className={`status-pill ${serviceStatus.ai ? "s-gewonnen" : "s-verloren"}`}>
              {serviceStatus.ai ? "Geconfigureerd" : "Niet actief"}
            </span>
          </div>
          {!serviceStatus.ai && (
            <p className="card-desc" style={{ marginTop: 8, color: "#92400e" }}>
              Voeg <code>ANTHROPIC_API_KEY</code> toe in Vercel en redeploy voor volledige AI
              functionaliteit.
            </p>
