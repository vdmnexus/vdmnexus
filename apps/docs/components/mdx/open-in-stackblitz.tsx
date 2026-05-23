/**
 * <OpenInStackBlitz /> — single-click "open this sample in a runnable
 * StackBlitz sandbox" button. Lets a reader go from "I see the code" to
 * "I have a runnable copy of it" without setting up a local project.
 *
 * Implementation: a plain HTML `<form>` POSTing to
 * `https://stackblitz.com/run` with the project payload as form fields,
 * targetting a new tab. No client JS required — the form is server-
 * rendered and submits via standard browser behavior. StackBlitz parses
 * `project[files][<path>]`, `project[dependencies]`, etc. and spins up
 * a fork. This is the documented POST API, not the fragile URL-encoded
 * JSON form.
 *
 * Usage:
 *   <OpenInStackBlitz
 *     title="Hello signed inference"
 *     files={{ "index.ts": "..." }}
 *     deps={{ "@vdm-nexus/x402": "^0.4.1" }}
 *   />
 */

type Props = {
  /** Project title shown in the StackBlitz tab. */
  title: string;
  /** Map of relative path → file contents. `index.ts` recommended as entry. */
  files: Record<string, string>;
  /** package.json dependencies. */
  deps?: Record<string, string>;
  /** StackBlitz project template — "node" runs a Node container; "typescript" runs a TS playground. */
  template?: "node" | "typescript" | "javascript";
  /** Optional description shown in the StackBlitz tab + meta. */
  description?: string;
  /** Button label. */
  label?: string;
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function OpenInStackBlitz({
  title,
  files,
  deps,
  template = "node",
  description,
  label = "Open in StackBlitz",
}: Props) {
  // For Node template, ship a package.json that runs `index.ts` via tsx
  // so the sample's TypeScript imports work end-to-end without a build
  // step. The user doesn't have to think about it.
  const allFiles: Record<string, string> = {
    ...files,
    "package.json": JSON.stringify(
      {
        name: slugify(title),
        private: true,
        type: "module",
        scripts: { start: "tsx index.ts" },
        dependencies: deps ?? {},
        devDependencies: {
          tsx: "^4",
          typescript: "^5",
        },
      },
      null,
      2
    ),
    "tsconfig.json": JSON.stringify(
      {
        compilerOptions: {
          target: "ES2022",
          module: "ESNext",
          moduleResolution: "Bundler",
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
        },
      },
      null,
      2
    ),
  };

  return (
    <form
      action="https://stackblitz.com/run"
      method="POST"
      target="_blank"
      style={{
        display: "inline-block",
        margin: "12px 0",
      }}
    >
      <input type="hidden" name="project[title]" value={title} />
      {description ? (
        <input
          type="hidden"
          name="project[description]"
          value={description}
        />
      ) : null}
      <input type="hidden" name="project[template]" value={template} />
      {Object.entries(allFiles).map(([path, content]) => (
        <input
          key={path}
          type="hidden"
          name={`project[files][${path}]`}
          value={content}
        />
      ))}
      <button
        type="submit"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 12px",
          borderRadius: 6,
          border: "1px solid #1e1e2e",
          background: "rgba(99, 102, 241, 0.1)",
          color: "#f1f5f9",
          fontSize: 12,
          fontWeight: 500,
          cursor: "pointer",
        }}
      >
        <span
          aria-hidden
          style={{ display: "inline-block", width: 14, height: 14 }}
        >
          <svg
            viewBox="0 0 28 28"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M9 17h5l-3 7 8-13h-5l3-7-8 13z"
              fill="#1389FD"
              stroke="#1389FD"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        {label}
      </button>
    </form>
  );
}
