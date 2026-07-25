import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import { Check, Copy } from "lucide-react";
import oneDark from "react-syntax-highlighter/dist/esm/styles/prism/one-dark";
import c from "react-syntax-highlighter/dist/esm/languages/prism/c";
import cpp from "react-syntax-highlighter/dist/esm/languages/prism/cpp";
import csharp from "react-syntax-highlighter/dist/esm/languages/prism/csharp";
import bash from "react-syntax-highlighter/dist/esm/languages/prism/bash";
import go from "react-syntax-highlighter/dist/esm/languages/prism/go";
import java from "react-syntax-highlighter/dist/esm/languages/prism/java";
import javascript from "react-syntax-highlighter/dist/esm/languages/prism/javascript";
import json from "react-syntax-highlighter/dist/esm/languages/prism/json";
import kotlin from "react-syntax-highlighter/dist/esm/languages/prism/kotlin";
import php from "react-syntax-highlighter/dist/esm/languages/prism/php";
import python from "react-syntax-highlighter/dist/esm/languages/prism/python";
import rust from "react-syntax-highlighter/dist/esm/languages/prism/rust";
import sql from "react-syntax-highlighter/dist/esm/languages/prism/sql";
import typescript from "react-syntax-highlighter/dist/esm/languages/prism/typescript";

/**
 * Markdown renderer for AI answers: GFM (tables, lists, task items) plus
 * syntax-highlighted fenced code blocks with a copy button.
 */

const LANGS = {
  c,
  cpp,
  csharp,
  bash,
  go,
  java,
  javascript,
  json,
  kotlin,
  php,
  python,
  rust,
  sql,
  typescript,
};
Object.entries(LANGS).forEach(([name, def]) => SyntaxHighlighter.registerLanguage(name, def));
SyntaxHighlighter.registerLanguage("js", javascript);
SyntaxHighlighter.registerLanguage("ts", typescript);
SyntaxHighlighter.registerLanguage("py", python);
SyntaxHighlighter.registerLanguage("shell", bash);
SyntaxHighlighter.registerLanguage("sh", bash);
SyntaxHighlighter.registerLanguage("c++", cpp);
SyntaxHighlighter.registerLanguage("cs", csharp);

const HighlightedBlock = ({ lang, code }) => {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — user can select manually */
    }
  };

  return (
    <div className="my-2 max-w-full overflow-hidden rounded-xl border border-ink-900/10 bg-[#282c34]">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-1.5">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-lav-300">
          {lang || "code"}
        </span>
        <button
          onClick={onCopy}
          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-cream-200/70 transition hover:bg-white/10 hover:text-white"
        >
          {copied ? <Check size={11} /> : <Copy size={11} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <SyntaxHighlighter
        language={lang && lang.toLowerCase()}
        style={oneDark}
        customStyle={{ margin: 0, background: "transparent", padding: "12px", fontSize: "12.5px" }}
        codeTagProps={{ style: { fontFamily: '"JetBrains Mono", Consolas, monospace' } }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
};

// Block code arrives as <pre><code class="language-x">; replacing `pre`
// wholesale means the `code` override below only ever sees inline code.
const components = {
  pre: ({ children }) => {
    const child = Array.isArray(children) ? children[0] : children;
    const className = child?.props?.className || "";
    const lang = /language-([\w+-]+)/.exec(className)?.[1];
    const code = String(child?.props?.children ?? "").replace(/\n$/, "");
    return <HighlightedBlock lang={lang} code={code} />;
  },
  code: ({ children }) => (
    <code className="rounded bg-lav-100 px-1 py-0.5 font-mono text-[0.85em] text-lav-800">
      {children}
    </code>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="font-medium text-lav-600 underline underline-offset-2 hover:text-lav-800"
    >
      {children}
    </a>
  ),
  h1: ({ children }) => <h1 className="mb-1.5 mt-3 text-base font-bold text-ink-900">{children}</h1>,
  h2: ({ children }) => <h2 className="mb-1.5 mt-3 text-[15px] font-bold text-ink-900">{children}</h2>,
  h3: ({ children }) => <h3 className="mb-1 mt-2.5 text-sm font-bold text-ink-900">{children}</h3>,
  p: ({ children }) => <p className="my-1.5 leading-relaxed">{children}</p>,
  ul: ({ children }) => <ul className="my-1.5 list-disc space-y-1 pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="my-1.5 list-decimal space-y-1 pl-5">{children}</ol>,
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-2 border-lav-300 pl-3 text-ink-500">{children}</blockquote>
  ),
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto">
      <table className="w-full border-collapse text-left text-xs">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border border-cream-300 bg-cream-200/70 px-2.5 py-1.5 font-semibold text-ink-700">
      {children}
    </th>
  ),
  td: ({ children }) => <td className="border border-cream-300 px-2.5 py-1.5">{children}</td>,
  hr: () => <hr className="my-3 border-cream-300" />,
};

export const MarkdownContent = ({ children }) => (
  <div className="text-[13.5px] text-ink-900 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {children}
    </ReactMarkdown>
  </div>
);
