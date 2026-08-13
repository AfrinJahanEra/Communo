import { Link } from "react-router-dom";
import {
  MessageSquareText,
  Hash,
  Mic,
  Users,
  Code2,
  Zap,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { Logo } from "../components/Logo";
import DotField from "../components/landing/DotField";

const FEATURES = [
  {
    icon: MessageSquareText,
    title: "Real-time messaging",
    body: "Instant channel chat, DMs, typing indicators and pins — everything updates live.",
  },
  {
    icon: Hash,
    title: "Servers & channels",
    body: "Organize your batch, courses and clubs into servers with text, announcement and voice channels.",
  },
  {
    icon: Code2,
    title: "Code snippets",
    body: "Share fenced code blocks that render beautifully — perfect for debugging together.",
  },
  {
    icon: Mic,
    title: "Voice study rooms",
    body: "Hop into a voice channel for group study sessions and pair programming.",
  },
  {
    icon: Users,
    title: "Friends & presence",
    body: "See who's online, idle or heads-down, and message friends directly.",
  },
  {
    icon: ShieldCheck,
    title: "Roles & permissions",
    body: "Fine-grained roles keep moderators in control and channels on-topic.",
  },
];

const Landing = () => (
  <div className="relative min-h-full overflow-hidden">
    <DotField />

    {/* Nav */}
    <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
      <Logo />
      <nav className="flex items-center gap-2">
        <Link to="/login" className="btn-ghost">
          Log in
        </Link>
        <Link to="/register" className="btn-primary">
          Get started
        </Link>
      </nav>
    </header>

    {/* Hero */}
    <section className="relative z-10 mx-auto max-w-4xl px-6 pb-16 pt-14 text-center sm:pt-20">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-lav-300 bg-lav-50 px-3 py-1 text-xs font-semibold text-lav-700">
        <Zap size={13} /> Built for CSE students
      </span>
      <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight text-ink-900 sm:text-6xl">
        Where your batch
        <span className="text-lav-500"> codes, talks & studies</span> together
      </h1>
      <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-ink-500 sm:text-lg">
        CodeCord brings servers, channels, threads, voice study rooms and code sharing into
        one calm, distraction-free space — so your study group never misses a beat.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link to="/register" className="btn-primary px-6 py-3 text-base">
          Create your account <ArrowRight size={17} />
        </Link>
        <Link to="/login" className="btn-ghost px-6 py-3 text-base">
          I already have one
        </Link>
      </div>
    </section>

    {/* Feature grid */}
    <section className="relative z-10 mx-auto max-w-6xl px-6 pb-20">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, body }) => (
          <div
            key={title}
            className="card bg-cream-50/85 p-6 backdrop-blur-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-lav-100 text-lav-600">
              <Icon size={22} />
            </span>
            <h3 className="mt-4 text-base font-bold text-ink-900">{title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{body}</p>
          </div>
        ))}
      </div>
    </section>

    <footer className="relative z-10 border-t border-cream-300 py-8 text-center text-xs text-ink-300">
      CodeCord — a collaborative communication platform for CSE students.
    </footer>
  </div>
);

export default Landing;
