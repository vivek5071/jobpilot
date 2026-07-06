import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";

const SYSTEM = `You are a resume-tailoring assistant for software engineers.
Given a candidate's resume and a job description, produce:
1. 4-6 resume bullet points rewritten to mirror the job description's exact keywords and priorities. Quantify where the resume gives numbers; never invent facts not present in the resume.
2. A 3-line cover note the candidate can paste into an application form.
Output plain markdown: a "## Tailored bullets" section and a "## Cover note" section. No preamble.`;

export async function POST(req: Request) {
  const { resume, jobDescription, apiKey } = await req.json();

  if (!resume?.trim() || !jobDescription?.trim()) {
    return new Response("resume and jobDescription are required", { status: 400 });
  }

  // BYOK: a visitor-supplied OpenRouter key is used for this request only —
  // never stored or logged. Precedence: BYOK > env OpenRouter > env
  // Anthropic > keyless demo. The client only sees a text stream.
  const byok =
    typeof apiKey === "string" && apiKey.trim().length > 0 && apiKey.length <= 256
      ? apiKey.trim()
      : undefined;
  const openRouterKey = byok ?? process.env.OPENROUTER_API_KEY;

  const mode = openRouterKey
    ? "live-openrouter"
    : process.env.ANTHROPIC_API_KEY
      ? "live-anthropic"
      : "demo";

  const stream = openRouterKey
    ? await openRouterStream(resume, jobDescription, openRouterKey)
    : mode === "live-anthropic"
      ? await realStream(resume, jobDescription)
      : demoStream(jobDescription);

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Tailor-Mode": mode,
    },
  });
}

function userPrompt(resume: string, jobDescription: string) {
  return `<resume>\n${resume}\n</resume>\n\n<job_description>\n${jobDescription}\n</job_description>`;
}

// OpenRouter: OpenAI-compatible chat completions over SSE, plain fetch.
async function openRouterStream(resume: string, jobDescription: string, key: string) {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL ?? "meta-llama/llama-3.3-70b-instruct:free",
      stream: true,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: userPrompt(resume, jobDescription) },
      ],
    }),
  });

  if (!res.ok || !res.body) {
    throw new Error(`OpenRouter error ${res.status}: ${await res.text()}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const data = line.trim().replace(/^data: ?/, "");
            if (!data || data === "[DONE]" || !line.startsWith("data:")) continue;
            const text = JSON.parse(data).choices?.[0]?.delta?.content;
            if (text) controller.enqueue(encoder.encode(text));
          }
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
    cancel() {
      void reader.cancel();
    },
  });
}

async function realStream(resume: string, jobDescription: string) {
  const client = new Anthropic();
  const stream = client.messages.stream({
    model: "claude-opus-4-8",
    max_tokens: 4096,
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: userPrompt(resume, jobDescription),
      },
    ],
  });

  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
    cancel() {
      stream.abort();
    },
  });
}

// Demo mode: no API key needed. Streams a realistic canned result token-by-token
// so the full streaming UX (rendering, cancel, errors) works in the deployed demo.
function demoStream(jobDescription: string) {
  const keywords = extractKeywords(jobDescription);
  const text = demoResult(keywords);
  const tokens = text.match(/\S+\s*/g) ?? [];
  const encoder = new TextEncoder();
  let cancelled = false;

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      for (const token of tokens) {
        if (cancelled) return;
        controller.enqueue(encoder.encode(token));
        await new Promise((r) => setTimeout(r, 24));
      }
      controller.close();
    },
    cancel() {
      cancelled = true;
    },
  });
}

const KNOWN_TECH = [
  "React", "TypeScript", "Next.js", "Redux", "JavaScript", "Node.js", "GraphQL",
  "CSS", "Tailwind", "accessibility", "performance", "testing", "Jest", "CI/CD",
  "REST", "Webpack", "Vite", "design system", "component library",
];

function extractKeywords(jd: string): string[] {
  const found = KNOWN_TECH.filter((t) => jd.toLowerCase().includes(t.toLowerCase()));
  return found.length >= 3 ? found.slice(0, 6) : ["React", "TypeScript", "performance"];
}

const CONCEPTS = ["performance", "accessibility", "testing", "design system"];

function demoResult(kw: string[]): string {
  const [a, b = "TypeScript"] = kw;
  const c = kw.find((k) => CONCEPTS.includes(k.toLowerCase())) ?? "performance";
  return `## Tailored bullets

- Built and shipped enterprise admin console modules in ${a} and ${b}, covering install/update/scheduling flows used across large device fleets — directly matching your ${a} product surface.
- Cut initial load time 40% on high-traffic pages via code splitting, lazy loading, and list virtualization (react-window) — the same ${c} levers this role calls out.
- Integrated complex REST APIs with robust loading, error, and empty states, pagination, and role-aware actions across admin workflows.
- Owned component-driven development with a shared in-house component library and Storybook, keeping UI consistent across four product teams.
- Led code reviews for high-impact modules; trusted with release-critical bug fixes under tight timelines.

## Cover note

I've spent 5 years building exactly this kind of product: ${a}/${b} admin consoles and dashboards where ${c} and reliability matter more than flash. Most recently I built the Library Module of Samsung Knox Manage, an enterprise device-management console. I'd love to bring that depth to your team.

*(demo mode — paste an OpenRouter key in the form, or set OPENROUTER_API_KEY / ANTHROPIC_API_KEY on the server, for live tailoring)*`;
}
