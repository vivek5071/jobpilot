"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { loadApplications } from "@/lib/store";

interface Command {
  id: string;
  label: string;
  hint?: string;
  run: () => void;
}

export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setSelected(0);
    previousFocus.current?.focus();
  }, []);

  // Global ⌘K / Ctrl+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (open) {
          close();
        } else {
          previousFocus.current = document.activeElement as HTMLElement;
          setOpen(true);
        }
      }
      if (e.key === "Escape" && open) close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const commands = useMemo<Command[]>(() => {
    if (!open) return [];
    const nav: Command[] = [
      { id: "tailor", label: "Tailor a resume", hint: "Page", run: () => router.push("/") },
      { id: "board", label: "Open tracker board", hint: "Page", run: () => router.push("/board") },
    ];
    const apps: Command[] = loadApplications().map((a) => ({
      id: a.id,
      label: `${a.company} — ${a.role}`,
      hint: a.status,
      run: () => router.push("/board"),
    }));
    return [...nav, ...apps];
  }, [open, router]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? commands.filter((c) => c.label.toLowerCase().includes(q)) : commands;
  }, [commands, query]);

  const run = (cmd: Command) => {
    cmd.run();
    close();
  };

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    } else if (e.key === "Enter" && results[selected]) {
      e.preventDefault();
      run(results[selected]);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-[15vh]"
      onClick={close}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg overflow-hidden rounded-lg border border-neutral-300 bg-white shadow-xl dark:border-neutral-700 dark:bg-neutral-900"
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected(0);
          }}
          onKeyDown={onInputKey}
          placeholder="Type a command or search applications…"
          role="combobox"
          aria-expanded="true"
          aria-controls="palette-results"
          aria-activedescendant={results[selected]?.id ?? undefined}
          className="w-full border-b border-neutral-200 bg-transparent p-4 text-sm outline-none dark:border-neutral-800"
        />
        <ul id="palette-results" role="listbox" className="max-h-72 overflow-y-auto p-2">
          {results.length === 0 && (
            <li className="p-3 text-sm text-neutral-400">No matches</li>
          )}
          {results.map((cmd, i) => (
            <li
              key={cmd.id}
              id={cmd.id}
              role="option"
              aria-selected={i === selected}
              onMouseEnter={() => setSelected(i)}
              onClick={() => run(cmd)}
              className={`flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm ${
                i === selected ? "bg-neutral-100 dark:bg-neutral-800" : ""
              }`}
            >
              <span>{cmd.label}</span>
              {cmd.hint && (
                <span className="text-xs uppercase tracking-wide text-neutral-400">
                  {cmd.hint}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
