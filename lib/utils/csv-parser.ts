import type { Lead } from "@/lib/types";

const COLUMN_MAP: Record<string, string> = {
  "first name": "firstName",
  "last name": "lastName",
  "first name (unformatted)": "firstName",
  "last name (unformatted)": "lastName",
  title: "contactTitle",
  "job title": "contactTitle",
  company: "company",
  "company name": "company",
  "# employees": "employees",
  "company size": "employees",
  "number of employees": "employees",
  industry: "sector",
  "person linkedin url": "linkedinUrl",
  "linkedin url": "linkedinUrl",
  url: "linkedinUrl",
  geography: "country",
  country: "country",
  location: "country",
};

function parseEmployees(value: string): number {
  if (!value) return 0;
  const match = value.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

function parseCountry(value: string): string {
  if (!value) return "NL";
  const v = value.toLowerCase();
  if (v.includes("neder") || v.includes("holland") || v === "nl") return "NL";
  if (v.includes("belgi") || v === "be") return "BE";
  if (v.includes("duits") || v.includes("germany") || v === "de") return "DE";
  return value.slice(0, 2).toUpperCase() || "NL";
}

function splitCSVLine(line: string, delimiter: string): string[] {
  const cols: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === delimiter && !inQuotes) {
      cols.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }

  cols.push(current.trim());
  return cols.map((c) => c.replace(/^"|"$/g, "").trim());
}

export function findDuplicateCompanies(
  parsed: Partial<Lead>[],
  existing: Lead[] = []
): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  const existingCompanies = new Set(
    existing.map((lead) => lead.company.toLowerCase().trim())
  );

  for (const lead of parsed) {
    const company = lead.company?.toLowerCase().trim();
    if (!company) continue;

    if (seen.has(company) || existingCompanies.has(company)) {
      duplicates.add(lead.company!);
    }
    seen.add(company);
  }

  return [...duplicates];
}

export function parseLinkedInCSV(file: File): Promise<Partial<Lead>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split(/\r?\n/).filter((line) => line.trim());
        if (lines.length < 2) {
          resolve([]);
          return;
        }

        const delimiter = lines[0].includes(";") ? ";" : ",";
        const headers = splitCSVLine(lines[0], delimiter).map((h) =>
          h.toLowerCase().trim()
        );

        const results: Partial<Lead>[] = [];

        for (let i = 1; i < lines.length; i++) {
          const cols = splitCSVLine(lines[i], delimiter);
          if (cols.every((c) => !c)) continue;

          const row: Record<string, string> = {};
          headers.forEach((h, idx) => {
            const mapped = COLUMN_MAP[h];
            if (mapped) row[mapped] = cols[idx] ?? "";
          });

          const firstName = row.firstName ?? "";
          const lastName = row.lastName ?? "";
          const contactName = [firstName, lastName].filter(Boolean).join(" ");

          if (!row.company && !contactName) continue;

          results.push({
            company: row.company || "Onbekend",
            country: parseCountry(row.country ?? ""),
            employees: parseEmployees(row.employees ?? ""),
            revenue: "",
            sector: row.sector ?? "",
            contactName: contactName || "Onbekend",
            contactTitle: row.contactTitle ?? "",
            linkedinUrl: row.linkedinUrl ?? "",
            status: "nieuw",
            notes: "",
            message: "",
          });
        }

        resolve(results);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Bestand kon niet worden gelezen"));
    reader.readAsText(file, "UTF-8");
  });
}
