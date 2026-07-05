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

  useEffect(() => {
    setApps(loadApplications());
    setLoaded(true);
  }, []);

  const update = (next: Application[]) => {
    setApps(next);
    saveApplications(next);
  };

  const move = (id: string, dir: -1 | 1) => {
    update(
      apps.map((a) => {
        if (a.id !== id) return a;
        const i = STATUSES.indexOf(a.status) + dir;
        return { ...a, status: STATUSES[Math.min(Math.max(i, 0), STATUSES.length - 1)] };
      }),
    );
  };

  const remove = (id: string) => update(apps.filter((a) => a.id !== id));

  return (
    <main className="mx-auto max-w-7xl p-6">
      <header className="mb-6 flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">Tracker board</h1>
        <Link href="/" className="text-sm underline underline-offset-4 hover:opacity-70">
          ← Tailor
        </Link>
      </header>

      {loaded && apps.length === 0 && (
        <p className="text-sm text-neutral-500">
          Nothing tracked yet — tailor a resume and hit &ldquo;Save to tracker&rdquo;.
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-5">
        {STATUSES.map((status) => (
          <section key={status} aria-label={LABELS[status]} className="flex flex-col gap-2">
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
                  className="rounded-md border border-neutral-300 p-3 text-sm dark:border-neutral-700"
                >
                  <div className="font-medium">{app.company}</div>
                  <div className="text-neutral-500">{app.role}</div>
                  <div className="mt-1 text-xs text-neutral-400">
                    {new Date(app.createdAt).toLocaleDateString()}
                  </div>
                  <div className="mt-2 flex gap-1">
                    <button
                      onClick={() => move(app.id, -1)}
                      disabled={status === STATUSES[0]}
                      aria-label={`Move ${app.company} left`}
                      className="rounded border border-neutral-300 px-2 py-0.5 text-xs disabled:opacity-30 dark:border-neutral-700"
                    >
                      ←
                    </button>
                    <button
                      onClick={() => move(app.id, 1)}
                      disabled={status === STATUSES[STATUSES.length - 1]}
                      aria-label={`Move ${app.company} right`}
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
