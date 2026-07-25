/**
 * Central language registry for the collaborative workspace.
 * Adding a language = adding one entry here:
 *  - monacoId  : Monaco Editor language identifier (frontend syntax highlighting)
 *  - extensions: file extensions mapped to this language
 *  - mime      : Content-Type used by the file download endpoint
 *  - jdoodle   : { language, versionIndex } for the JDoodle execute API,
 *                or null when the language is edit-only (not executable)
 */
export const LANGUAGES = Object.freeze({
  c: {
    label: "C",
    monacoId: "c",
    extensions: [".c", ".h"],
    mime: "text/x-c",
    jdoodle: { language: "c", versionIndex: "5" }, // GCC 11.1.0
  },
  cpp: {
    label: "C++",
    monacoId: "cpp",
    extensions: [".cpp", ".cc", ".cxx", ".hpp"],
    mime: "text/x-c++",
    jdoodle: { language: "cpp", versionIndex: "5" }, // GCC 11.1.0
  },
  java: {
    label: "Java",
    monacoId: "java",
    extensions: [".java"],
    mime: "text/x-java-source",
    jdoodle: { language: "java", versionIndex: "4" }, // JDK 17.0.1
  },
  python: {
    label: "Python",
    monacoId: "python",
    extensions: [".py"],
    mime: "text/x-python",
    jdoodle: { language: "python3", versionIndex: "4" }, // 3.9.9
  },
  javascript: {
    label: "JavaScript",
    monacoId: "javascript",
    extensions: [".js", ".mjs", ".cjs"],
    mime: "text/javascript",
    jdoodle: { language: "nodejs", versionIndex: "4" }, // Node 17.1.0
  },
  typescript: {
    label: "TypeScript",
    monacoId: "typescript",
    extensions: [".ts", ".tsx"],
    mime: "text/typescript",
    jdoodle: { language: "typescript", versionIndex: "0" },
  },
  go: {
    label: "Go",
    monacoId: "go",
    extensions: [".go"],
    mime: "text/x-go",
    jdoodle: { language: "go", versionIndex: "4" }, // 1.17.5
  },
  rust: {
    label: "Rust",
    monacoId: "rust",
    extensions: [".rs"],
    mime: "text/x-rust",
    jdoodle: { language: "rust", versionIndex: "4" }, // 1.56.1
  },
  kotlin: {
    label: "Kotlin",
    monacoId: "kotlin",
    extensions: [".kt", ".kts"],
    mime: "text/x-kotlin",
    jdoodle: { language: "kotlin", versionIndex: "3" }, // 1.6.0
  },
  csharp: {
    label: "C#",
    monacoId: "csharp",
    extensions: [".cs"],
    mime: "text/x-csharp",
    jdoodle: { language: "csharp", versionIndex: "4" }, // mono 6.12
  },
  php: {
    label: "PHP",
    monacoId: "php",
    extensions: [".php"],
    mime: "text/x-php",
    jdoodle: { language: "php", versionIndex: "4" }, // 8.0.13
  },
  // Edit-only helpers so notes/config files highlight nicely in Monaco
  markdown: {
    label: "Markdown",
    monacoId: "markdown",
    extensions: [".md"],
    mime: "text/markdown",
    jdoodle: null,
  },
  json: {
    label: "JSON",
    monacoId: "json",
    extensions: [".json"],
    mime: "application/json",
    jdoodle: null,
  },
  html: {
    label: "HTML",
    monacoId: "html",
    extensions: [".html", ".htm"],
    mime: "text/html",
    jdoodle: null,
  },
  css: {
    label: "CSS",
    monacoId: "css",
    extensions: [".css"],
    mime: "text/css",
    jdoodle: null,
  },
  plaintext: {
    label: "Plain Text",
    monacoId: "plaintext",
    extensions: [".txt"],
    mime: "text/plain",
    jdoodle: null,
  },
});

export const LANGUAGE_KEYS = Object.keys(LANGUAGES);

/** Language keys accepted by the execute endpoint. */
export const EXECUTABLE_LANGUAGES = LANGUAGE_KEYS.filter((key) => LANGUAGES[key].jdoodle);

const extensionIndex = new Map();
for (const [key, def] of Object.entries(LANGUAGES)) {
  for (const ext of def.extensions) extensionIndex.set(ext, key);
}

/** Resolves the language key for a file path (fallback: plaintext). */
export const languageForPath = (path) => {
  const dot = path.lastIndexOf(".");
  if (dot === -1) return "plaintext";
  return extensionIndex.get(path.slice(dot).toLowerCase()) ?? "plaintext";
};

/** MIME type used when downloading a workspace file. */
export const mimeForLanguage = (language) =>
  LANGUAGES[language]?.mime ?? "application/octet-stream";
