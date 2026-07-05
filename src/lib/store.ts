import type { Application } from "./types";

const KEY = "jobpilot.applications";

// ponytail: localStorage store; swap for a DB when multi-device sync matters
export function loadApplications(): Application[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function saveApplications(apps: Application[]) {
  localStorage.setItem(KEY, JSON.stringify(apps));
}
