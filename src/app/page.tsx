"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { loadApplications, saveApplications } from "@/lib/store";
import type { Application } from "@/lib/types";

const RESUME_KEY = "jobpilot.resume";

type Phase = "idle" | "streaming" | "done" | "error";

export default function TailorPage() {
  const [resume, setResume] = useState("");
  const [jd, setJd] = useState("");
  const [output, setOutput] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [saved, setSaved] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setResume(localStorage.getItem(RESUME_KEY) ?? "");
  }, []);

  useEffect(() => {
    if (resume) localStorage.setItem(RESUME_KEY, resume);
  }, [resume]);

  // Follow the stream as it grows
  useEffect(() => {
    outputRef.current?.scrollTo({ top: outputRef.current.scrollHeight });
  }, [output]);

  const tailor = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setOutput("");
    setError("");
    setSaved(false);
    setPhase("streaming");

    try {
      const res = await fetch("/api/tailor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume, jobDescription: jd }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) throw new Error(await res.text());

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        setOutput((prev) => prev + decoder.decode(value, { stream: true }));
      }
      setPhase("done");
    } catch (err) {
      if (controller.signal.aborted) {
        setPhase("done"); // user cancelled — keep partial output
      } else {
        setError(err instanceof Error ? err.message : "Something went wrong");
        setPhase("error");
      }
    }
  }, [resume, jd]);

  const cancel = () => abortRef.current?.abort();

  const saveToTracker = () => {
    const apps = loadApplications();
    const app: Application = {
      id: crypto.randomUUID(),
      company: company.trim() || "Unknown company",
      role: role.trim() || "Unknown role",
      jdExcerpt: jd.slice(0, 280),
      bullets: output,
      status: "saved",
      createdAt: new Date().toISOString(),
    };
    saveApplications([app, ...apps]);
    setSaved(true);
  };

  const canTailor = Boolean(resume.trim() && jd.trim()) && phase !== "streaming";

  return (
    <main className="mx-auto max-w-5xl p-6">
      <header className="mb-6 flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">JobPilot</h1>
        <Link href="/board" className="text-sm underline underline-offset-4 hover:opacity-70">
          Tracker board →
        </Link>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Your resume (saved locally)</span>
            <textarea
              value={resume}
              onChange={(e) => setResume(e.target.value)}
              placeholder="Paste your resume text once — it stays in your browser."
              className="h-40 resize-y rounded-md border border-neutral-300 bg-transparent p-3 text-sm dark:border-neutral-700"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Job description</span>
            <textarea
              value={jd}
              onChange={(e) => setJd(e.target.value)}
              placeholder="Paste the JD you're applying to."
              className="h-56 resize-y rounded-md border border-neutral-300 bg-transparent p-3 text-sm dark:border-neutral-700"
            />
          </label>

          <div className="flex gap-2">
            <input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Company"
              aria-label="Company"
              className="w-1/2 rounded-md border border-neutral-300 bg-transparent p-2 text-sm dark:border-neutral-700"
            />
            <input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="Role"
              aria-label="Role"
              className="w-1/2 rounded-md border border-neutral-300 bg-transparent p-2 text-sm dark:border-neutral-700"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={tailor}
              disabled={!canTailor}
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-black"
            >
              {phase === "streaming" ? "Tailoring…" : "Tailor my resume"}
            </button>
            {phase === "streaming" && (
              <button
                onClick={cancel}
                className="rounded-md border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700"
              >
                Stop
              </button>
            )}
            {phase === "error" && (
              <button
                onClick={tailor}
                className="rounded-md border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700"
              >
                Retry
              </button>
            )}
          </div>
          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}
        </section>

        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Tailored output</span>
            {phase === "done" && output && (
              <button
                onClick={saveToTracker}
                disabled={saved}
                className="rounded-md border border-neutral-300 px-3 py-1 text-sm disabled:opacity-40 dark:border-neutral-700"
              >
                {saved ? "Saved ✓" : "Save to tracker"}
              </button>
            )}
          </div>
          <div
            ref={outputRef}
            aria-live="polite"
            className="h-[32rem] overflow-y-auto whitespace-pre-wrap rounded-md border border-neutral-300 p-4 text-sm leading-6 dark:border-neutral-700"
          >
            {output || (
              <span className="text-neutral-400">
                Output streams here token by token. Runs in demo mode without an API key.
              </span>
            )}
            {phase === "streaming" && <span className="animate-pulse">▍</span>}
          </div>
        </section>
      </div>
    </main>
  );
}
