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
  UserPlus,
  MessagesSquare,
  Rocket,
  Sparkles,
  Terminal,
  Headphones,
} from "lucide-react";
import { Logo } from "../components/Logo";
import AuroraBackground from "../components/landing/AuroraBackground";
import DotField from "../components/landing/DotField";
import KnotOrbit from "../components/landing/KnotOrbit";
import Reveal from "../components/landing/Reveal";
import StatsBand from "../components/landing/StatsBand";
import { FeatureMarquee } from "../components/landing/FeatureMarquee";

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

const STATS = [
  { value: 20, suffix: "+", label: "Languages you can run" },
  { value: 5, suffix: "", label: "Channel types" },
  { value: 24, suffix: "/7", label: "Realtime sync" },
  { value: 100, suffix: "%", label: "Built for IUT" },
];

const STEPS = [
  {
    icon: UserPlus,
    step: "01",
    title: "Sign up with your IUT email",
    body: "Register with your @iut-dhaka.edu address, confirm it from your inbox, and you're in.",
  },
  {
    icon: MessagesSquare,
    step: "02",
    title: "Join your batch server",
    body: "Hop into channels for courses, clubs and late-night doubt solving — threads keep deep dives tidy.",
  },
  {
    icon: Rocket,
    step: "03",
    title: "Build & study together",
    body: "Run code side-by-side, share resources, and settle into a voice room for group study.",
  },
];

/** Small floating icon chips scattered around the hero for extra life. */
const FLOATING_CHIPS = [
  { icon: Code2, className: "left-[8%] top-[18%]", delay: "0s" },
  { icon: Mic, className: "right-[10%] top-[24%]", delay: "0.8s" },
  { icon: Terminal, className: "left-[14%] bottom-[16%]", delay: "1.6s" },
  { icon: Headphones, className: "right-[14%] bottom-[20%]", delay: "2.4s" },
];

const Landing = () => (
  // pointer-events-none here too: this box spans the whole page (including
  // the margins outside the centered header/hero/feature sections), so it
  // would otherwise swallow clicks meant for the dot field beneath it.
  <div className="pointer-events-none relative min-h-screen overflow-x-hidden">
    {/* Layered ambient backdrop (aurora + grid + grain) beneath the dot field */}
    <AuroraBackground />
    <DotField />

    {/* Nav */}
    {/* pointer-events-none lets clicks fall through the empty parts of this
        section to the dot field behind it; re-enabled on the actual controls. */}
    <header className="pointer-events-none relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
      <Logo />
      <nav className="pointer-events-auto flex items-center gap-2">
        <Link to="/login" className="btn-ghost">
          Log in
        </Link>
        <Link to="/register" className="btn-primary">
          Get started
        </Link>
      </nav>
    </header>

    {/* Hero — the torus-knot particle stream drifts behind the copy */}
    <section className="pointer-events-none relative mx-auto max-w-5xl px-6 pt-10 text-center sm:pt-16">
      <div className="absolute inset-x-0 -top-10 bottom-0">
        <KnotOrbit />
      </div>
      {/* Soft wash so the headline stays readable over the particles */}
      <div className="absolute inset-x-8 top-4 bottom-16 bg-[radial-gradient(ellipse_at_center,rgba(250,250,251,0.92)_25%,transparent_70%)]" />

      {/* Floating accent chips */}
      {FLOATING_CHIPS.map(({ icon: Icon, className, delay }, i) => (
        <span
          key={i}
          className={`pointer-events-none absolute hidden ${className} animate-float motion-reduce:animate-none`}
          style={{ animationDelay: delay }}
        >
          <span className="card flex h-11 w-11 items-center justify-center bg-white/80 text-lav-500 backdrop-blur-sm">
            <Icon size={20} />
          </span>
        </span>
      ))}

      <div className="relative">
        <Reveal>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-lav-300 bg-lav-50 px-3.5 py-1.5 text-xs font-semibold text-lav-700">
            <Zap size={13} /> Built for IUT students
          </span>
        </Reveal>

        <Reveal delay={100}>
          <h1 className="font-display mx-auto mt-6 max-w-3xl text-5xl font-bold leading-[1.08] tracking-tight text-ink-900 sm:text-7xl">
            Where your batch
            <span className="block animate-shimmer bg-[linear-gradient(90deg,#8f7ab8,#614f83,#bcb0da,#8f7ab8)] bg-[length:200%_auto] bg-clip-text pb-2 text-transparent motion-reduce:animate-none">
              codes, talks & studies
            </span>
            together
          </h1>
        </Reveal>

        <Reveal delay={200}>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-ink-500 sm:text-lg">
            Communo brings servers, channels, threads, voice study rooms, an in-browser IDE
            and an AI doubt solver into one calm, distraction-free space — so your study
            group never misses a beat.
          </p>
        </Reveal>

        <Reveal delay={300}>
          <div className="pointer-events-auto mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link to="/register" className="btn-primary px-7 py-3.5 text-base shadow-lg shadow-lav-200">
              Create your account <ArrowRight size={17} />
            </Link>
            <Link to="/login" className="btn-ghost px-7 py-3.5 text-base">
              I already have one
            </Link>
          </div>
        </Reveal>

        <Reveal delay={400}>
          <p className="mt-5 flex items-center justify-center gap-1.5 text-xs text-ink-300">
            <Sparkles size={13} className="text-lav-400" />
            Free forever for IUT students — sign in with your institutional email
          </p>
        </Reveal>
      </div>
    </section>

    {/* Stats band */}
    <section className="pointer-events-none relative z-10 mx-auto max-w-5xl px-6 pt-20">
      <Reveal>
        <StatsBand stats={STATS} />
      </Reveal>
    </section>

    {/* Feature marquee */}
    <section className="pointer-events-none relative z-10 mx-auto max-w-6xl px-6 pt-24">
      <Reveal>
        <h2 className="text-center text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">
          Everything your study group needs
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-sm text-ink-500 sm:text-base">
          One home for conversations, code and collaboration — no more juggling five apps.
        </p>
      </Reveal>
      <div className="pt-10">
        <FeatureMarquee features={FEATURES} />
      </div>
    </section>

    {/* How it works */}
    <section className="pointer-events-none relative z-10 mx-auto max-w-6xl px-6 pt-24">
      <Reveal>
        <h2 className="text-center text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">
          Up and running in minutes
        </h2>
      </Reveal>
      <div className="mt-10 grid gap-6 sm:grid-cols-3">
        {STEPS.map((step, i) => (
          <Reveal key={step.step} delay={i * 120}>
            <div className="pointer-events-auto card relative h-full overflow-hidden bg-white/80 p-8 backdrop-blur-sm transition hover:-translate-y-1 hover:shadow-lg">
              <span className="font-display absolute right-5 top-4 text-6xl font-bold text-lav-100">
                {step.step}
              </span>
              <span className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-lav-100 text-lav-600">
                <step.icon size={24} />
              </span>
              <h3 className="relative mt-5 text-lg font-bold text-ink-900">{step.title}</h3>
              <p className="relative mt-2 text-sm leading-relaxed text-ink-500">{step.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>

    {/* Closing CTA */}
    <section className="pointer-events-none relative z-10 mx-auto max-w-5xl px-6 pt-24">
      <Reveal>
        <div className="pointer-events-auto relative overflow-hidden rounded-3xl bg-[linear-gradient(135deg,#614f83,#8f7ab8_55%,#bcb0da)] px-8 py-16 text-center shadow-xl shadow-lav-200 sm:px-16">
          {/* Decorative rings */}
          <span className="absolute -left-16 -top-16 h-56 w-56 rounded-full border border-white/15" />
          <span className="absolute -bottom-24 -right-10 h-72 w-72 rounded-full border border-white/10" />
          <span className="absolute right-16 top-8 h-3 w-3 animate-float rounded-full bg-white/40 motion-reduce:animate-none" />
          <span
            className="absolute bottom-10 left-20 h-2 w-2 animate-float rounded-full bg-white/50 motion-reduce:animate-none"
            style={{ animationDelay: "1.2s" }}
          />

          <h2 className="relative text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Your batch is already here.
          </h2>
          <p className="relative mx-auto mt-4 max-w-xl text-sm leading-relaxed text-lav-100 sm:text-base">
            Grab your @iut-dhaka.edu email, claim your account, and jump straight into the
            conversation — setup takes less than two minutes.
          </p>
          <div className="relative mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-base font-semibold text-lav-700 transition hover:bg-lav-50 active:scale-[0.98]"
            >
              Get started free <ArrowRight size={17} />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-xl border border-white/40 px-7 py-3.5 text-base font-semibold text-white transition hover:bg-white/10 active:scale-[0.98]"
            >
              Log in
            </Link>
          </div>
        </div>
      </Reveal>
    </section>

    <footer className="pointer-events-none relative z-10 mt-20 border-t border-cream-300 py-10 text-center text-xs text-ink-300">
      Communo — a collaborative communication platform for IUT students.
      <span className="mt-1 block">Chat · Code · Study — together.</span>
    </footer>
  </div>
);

export default Landing;
