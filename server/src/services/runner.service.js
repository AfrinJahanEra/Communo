import { execFile, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import logger from "../utils/logger.js";

const RUN_TIMEOUT_MS = 60_000;
const COMPILE_TIMEOUT_MS = 20_000;
const MAX_OUTPUT_BYTES = 256 * 1024;
const IS_WIN = process.platform === "win32";

/**
 * Child processes get a stripped environment: never hand server secrets
 * (DB URIs, JWT keys, …) to user-supplied code.
 */
const CHILD_ENV = (() => {
  const keep = [
    "PATH",
    "Path",
    "SYSTEMROOT",
    "TEMP",
    "TMP",
    "USERPROFILE",
    "HOME",
    "LANG",
    "GOCACHE",
    "GOPATH",
  ];
  const env = {};
  for (const key of keep) if (process.env[key] !== undefined) env[key] = process.env[key];
  return env;
})();

// ---------- runtime detection ----------

const probeCache = new Map();

/** True when `cmd` resolves to an executable on this host. */
const commandExists = (cmd) =>
  new Promise((resolve) => {
    if (probeCache.has(cmd)) return resolve(probeCache.get(cmd));
    execFile(
      cmd,
      ["--version"],
      { timeout: 5000, env: CHILD_ENV, windowsHide: true },
      (err) => {
        // ENOENT / 9009 = not installed; a numeric exit code means the tool
        // exists but simply dislikes --version (e.g. `go`).
        const ok = !err || (typeof err.code === "number" && err.code !== 9009);
        probeCache.set(cmd, ok);
        resolve(ok);
      }
    );
  });

// ---------- language runners ----------

const EXTENSIONS = {
  python: ".py",
  javascript: ".js",
  c: ".c",
  cpp: ".cpp",
  go: ".go",
  rust: ".rs",
  java: ".java",
};

const binary = (dir) => path.join(dir, IS_WIN ? "program.exe" : "program");

/**
 * Each entry: needs  = binaries that must exist for local runs,
 *            compile = optional build step (stderr is streamed),
 *            start   = the command to run the program.
 */
const RUNNERS = {
  python: {
    needs: ["python"],
    start: (dir, file) => ({ cmd: "python", args: ["-u", file] }),
  },
  javascript: {
    needs: ["node"],
    start: (dir, file) => ({ cmd: "node", args: [file] }),
  },
  go: {
    needs: ["go"],
    start: (dir, file) => ({ cmd: "go", args: ["run", file] }),
  },
  c: {
    needs: ["gcc"],
    compile: (dir, file) => ({ cmd: "gcc", args: [file, "-o", binary(dir)] }),
    start: (dir) => ({ cmd: binary(dir), args: [] }),
  },
  cpp: {
    needs: ["g++"],
    compile: (dir, file) => ({ cmd: "g++", args: [file, "-o", binary(dir)] }),
    start: (dir) => ({ cmd: binary(dir), args: [] }),
  },
  rust: {
    needs: ["rustc"],
    compile: (dir, file) => ({ cmd: "rustc", args: [file, "-o", binary(dir)] }),
    start: (dir) => ({ cmd: binary(dir), args: [] }),
  },
  java: {
    needs: ["javac", "java"],
    compile: (dir, file) => ({ cmd: "javac", args: [file] }),
    start: (dir, file, className) => ({ cmd: "java", args: ["-cp", dir, className] }),
  },
};

export const isLocallySupported = async (language) => {
  const def = RUNNERS[language];
  if (!def) return false;
  const checks = await Promise.all(def.needs.map(commandExists));
  return checks.every(Boolean);
};

// ---------- run lifecycle ----------

/**
 * Starts a local interactive run and returns the stdin/stop handle
 * immediately — setup, compile and spawn happen in the background while
 * output streams back through the callbacks (VS Code style).
 * Statuses: success | compile_error | runtime_error | stopped.
 */
export const start = ({ language, source }, { onStdout, onStderr, onSystem, onEnd }) => {
  const def = RUNNERS[language];
  if (!def) return null;

  const startedAt = Date.now();

  let child = null;
  let finished = false;
  let stopped = false;
  let bytes = 0;
  let timer = null;
  const pendingStdin = []; // lines typed before the process spawned

  const finish = (status, exitCode) => {
    if (finished) return;
    finished = true;
    if (timer) clearTimeout(timer);
    onEnd({ status, exitCode, ms: Date.now() - startedAt });
  };

  const kill = () => {
    if (child && !child.killed) child.kill("SIGKILL");
  };

  const pipe = (stream, sink) =>
    stream.on("data", (chunk) => {
      if (finished || bytes >= MAX_OUTPUT_BYTES) return;
      bytes += chunk.length;
      sink(chunk.toString("utf8"));
      if (bytes >= MAX_OUTPUT_BYTES) {
        onSystem("\nOutput limit (256 KB) reached — stopping the run.");
        kill();
      }
    });

  const launch = (dir, file, className, cleanupDir) => {
    const { cmd, args } = def.start(dir, file, className);
    child = spawn(cmd, args, { cwd: dir, env: CHILD_ENV, windowsHide: true });
    pipe(child.stdout, onStdout);
    pipe(child.stderr, onStderr);

    child.on("error", (err) => {
      onSystem(`Failed to start ${cmd}: ${err.message}`);
      finish("runtime_error", null);
      cleanupDir();
    });

    child.on("close", (code, signal) => {
      if (stopped) {
        onSystem("\nRun stopped.");
        finish("stopped", code);
      } else if (signal || (code !== null && code !== 0)) {
        onSystem(`\nProcess exited with ${signal ? `signal ${signal}` : `code ${code}`}.`);
        finish("runtime_error", code);
      } else {
        onSystem("\nProgram finished.");
        finish("success", code ?? 0);
      }
      cleanupDir();
    });

    // Flush anything typed while we were compiling
    for (const text of pendingStdin.splice(0)) {
      if (child.stdin.writable) child.stdin.write(text);
    }
    if (stopped) kill();

    timer = setTimeout(() => {
      onSystem("\nTime limit (60 s) reached — stopping the run.");
      kill();
    }, RUN_TIMEOUT_MS);
  };

  (async () => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), "communo-run-"));
    const cleanupDir = () => fsp.rm(dir, { recursive: true, force: true }).catch(() => {});

    // javac requires the file name to match the public class name
    let className = null;
    if (language === "java") {
      const match =
        source.match(/public\s+class\s+([A-Za-z_$][\w$]*)/) ||
        source.match(/class\s+([A-Za-z_$][\w$]*)/);
      className = match ? match[1] : "Main";
    }

    const file = path.join(dir, (className || "program") + (EXTENSIONS[language] || ".txt"));
    await fsp.writeFile(file, source, "utf8");

    if (def.compile) {
      const { cmd, args } = def.compile(dir, file);
      const compiled = await new Promise((resolve) => {
        execFile(
          cmd,
          args,
          {
            cwd: dir,
            timeout: COMPILE_TIMEOUT_MS,
            env: CHILD_ENV,
            windowsHide: true,
            maxBuffer: 1024 * 1024,
          },
          (err, stdout, stderr) => {
            if (stdout) onStdout(stdout);
            if (stderr) onStderr(stderr);
            resolve(!err);
          }
        );
      });
      if (!compiled) {
        finish("compile_error", null);
        cleanupDir();
        return;
      }
    }

    if (stopped || finished) {
      cleanupDir();
      return;
    }
    launch(dir, file, className, cleanupDir);
  })().catch((err) => {
    logger.error(`local runner failed to start: ${err.message}`);
    onSystem(`Runner error: ${err.message}`);
    finish("runtime_error", null);
  });

  return {
    /** Sends one line of stdin (newline appended); buffered pre-spawn. */
    write: (line) => {
      const text = line.endsWith("\n") ? line : `${line}\n`;
      if (child && child.stdin.writable) child.stdin.write(text);
      else pendingStdin.push(text);
    },
    stop: () => {
      if (!finished) {
        stopped = true;
        kill();
      }
    },
  };
};

export const newRunId = () => `run-${randomUUID()}`;
