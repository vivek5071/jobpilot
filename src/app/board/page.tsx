"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { loadApplications, saveApplications } from "@/lib/store";
import { STATUSES, type Application, type Status } from "@/lib/types";

const LABELS: Record<Status, string> = {
  saved: "Saved",
  applied: "Applied",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
};

export default function BoardPage() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [dropTarget, setDropTarget] = useState<Status | null>(null);

  useEffect(() => {
    setApps(loadApplications());
    setLoaded(true);
  }, []);

  const update = (next: Application[]) => {
    setApps(next);
    saveApplications(next);
  };

  const setStatus = (id: string, status: Status) =>
    update(apps.map((a) => (a.id === id ? { ...a, status } : a)));

  const move = (id: string, dir: -1 | 1) => {
    const app = apps.find((a) => a.id === id);
    if (!app) return;
    const i = STATUSES.indexOf(app.status) + dir;
    setStatus(id, STATUSES[Math.min(Math.max(i, 0), STATUSES.length - 1)]);
  };

  const remove = (id: string) => update(apps.filter((a) => a.id !== id));

  const onDrop = (e: React.DragEvent, status: Status) => {
    e.preventDefault();
    setDropTarget(null);
    const id = e.dataTransfer.getData("text/plain");
    if (id) setStatus(id, status);
  };

  return (
    <main className="mx-auto max-w-7xl p-6">
      <header className="mb-6 flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">Tracker board</h1>
        <div className="flex items-center gap-4 text-sm">
          <kbd className="rounded border border-neutral-300 px-1.5 py-0.5 text-xs text-neutral-500 dark:border-neutral-700">
            ⌘K
          </kbd>
          <Link href="/" className="underline underline-offset-4 hover:opacity-70">
            ← Tailor
          </Link>
        </div>
      </header>

      {loaded && apps.length === 0 && (
        <p className="text-sm text-neutral-500">
          Nothing tracked yet — tailor a resume and hit &ldquo;Save to tracker&rdquo;.
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-5">
        {STATUSES.map((status) => (
          <section
            key={status}
            aria-label={LABELS[status]}
            onDragOver={(e) => {
              e.preventDefault();
              setDropTarget(status);
            }}
            onDragLeave={() => setDropTarget((t) => (t === status ? null : t))}
            onDrop={(e) => onDrop(e, status)}
            className={`flex min-h-40 flex-col gap-2 rounded-md p-1 transition-colors ${
              dropTarget === status ? "bg-neutral-100 dark:bg-neutral-800/60" : ""
            }`}
          >
            <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
              {LABELS[status]}{" "}
              <span className="font-normal">
                ({apps.filter((a) => a.status === status).length})
              </span>
            </h2>
            {apps
              .filter((a) => a.status === status)
              .map((app) => (
                <article
                  key={app.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", app.id);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  className="cursor-grab rounded-md border border-neutral-300 bg-white p-3 text-sm active:cursor-grabbing dark:border-neutral-700 dark:bg-neutral-900"
                >
                  <div className="font-medium">{app.company}</div>
                  <div className="text-neutral-500">{app.role}</div>
                  <div className="mt-1 text-xs text-neutral-400">
                    {new Date(app.createdAt).toLocaleDateString()}
                  </div>
                  {/* Buttons stay: keyboard + touch path for the same action as DnD */}
                  <div className="mt-2 flex gap-1">
                    <button
                      onClick={() => move(app.id, -1)}
                      disabled={status === STATUSES[0]}
                      aria-label={`Move ${app.company} to previous column`}
                      className="rounded border border-neutral-300 px-2 py-0.5 text-xs disabled:opacity-30 dark:border-neutral-700"
                    >
                      ←
                    </button>
                    <button
                      onClick={() => move(app.id, 1)}
                      disabled={status === STATUSES[STATUSES.length - 1]}
                      aria-label={`Move ${app.company} to next column`}
                      className="rounded border border-neutral-300 px-2 py-0.5 text-xs disabled:opacity-30 dark:border-neutral-700"
                    >
                      →
                    </button>
                    <button
                      onClick={() => remove(app.id)}
                      aria-label={`Delete ${app.company}`}
                      className="ml-auto rounded border border-neutral-300 px-2 py-0.5 text-xs text-red-600 dark:border-neutral-700"
                    >
                      ✕
                    </button>
                  </div>
                </article>
              ))}
          </section>
        ))}
      </div>
    </main>
  );
}
