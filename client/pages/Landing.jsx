import { Link } from "react-router-dom";
import {
  MessageSquare,
  Server,
  Layers,
  Mic,
  Code2,
  Bot,
  Briefcase,
  Pencil,
  ChevronRight,
  ArrowRight,
  Zap,
} from "lucide-react";

const features = [
  {
    icon: MessageSquare,
    title: "Real-Time Messaging",
    description:
      "Instant communication with typing indicators, reactions, threaded discussions, code snippet formatting, syntax highlighting, and file sharing.",
  },
  {
    icon: Server,
    title: "Topic-Based Servers",
    description:
      "CSE-focused servers organized by academic topics: Data Structures, OOP, DBMS, Operating Systems, AI/ML, Web Development, and more.",
  },
  {
    icon: Layers,
    title: "Smart Channels",
    description:
      "Structured channels for discussion, resources, assignment help, viva prep, coding help, and internship news within every server.",
  },
  {
    icon: Mic,
    title: "Voice Study Rooms",
    description:
      "Join voice rooms for group study, pair programming, mock interviews, and focus timer sessions that track productivity streaks.",
  },
  {
    icon: Code2,
    title: "Collaborative Code Editor",
    description:
      "Built-in live coding editor with shared cursors, multi-language support, code execution, and real-time collaborative debugging.",
  },
  {
    icon: Bot,
    title: "AI Doubt Solver",
    description:
      "AI bot inside chat that explains concepts, answers questions, generates examples, summarizes notes, and assists during discussions.",
  },
  {
    icon: Briefcase,
    title: "Interview Prep & AI Summary",
    description:
      "Dedicated spaces for mock interviews, DSA practice, and HR prep. AI converts speech to text and generates meeting summaries.",
  },
  {
    icon: Pencil,
    title: "Live Collaborative Whiteboard",
    description:
      "Draw flowcharts, architecture diagrams, sticky notes, and brainstorm in real time without leaving the chat.",
  },
];

const steps = [
  {
    number: "01",
    title: "Create Your Account",
    description: "Sign up in seconds with your email. Set your username and profile to get started.",
  },
  {
    number: "02",
    title: "Join Servers",
    description:
      "Browse and join topic-based servers that match your courses, interests, and goals.",
  },
  {
    number: "03",
    title: "Start Collaborating",
    description:
      "Chat, code, study, and grow with your peers using powerful built-in tools.",
  },
];

export default function Landing() {
  return (
    <div className="bg-[#0f0f14] text-gray-100 min-h-screen overflow-x-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0f0f14]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Code2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">CodeCord</span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm text-gray-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
            >
              Log In
            </Link>
            <Link
              to="/register"
              className="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 md:pt-44 md:pb-36 px-6">
        {/* Background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-20 right-1/4 w-[300px] h-[300px] bg-purple-600/8 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 text-sm font-medium mb-8">
            <Zap className="w-4 h-4" />
            Built for CSE Students
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6">
            Where CSE Students{" "}
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
              Connect, Code,
            </span>{" "}
            and Collaborate
          </h1>

          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            CodeCord is a Discord-inspired platform that brings together academic discussion,
            real-time coding, AI assistance, and productivity tools in one dedicated space for
            computer science students.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="w-full sm:w-auto px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-semibold text-base transition-all hover:shadow-lg hover:shadow-indigo-600/20 flex items-center justify-center gap-2"
            >
              Get Started Free
              <ArrowRight className="w-5 h-5" />
            </Link>
            <a
              href="#features"
              className="w-full sm:w-auto px-8 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg font-semibold text-base transition-all flex items-center justify-center gap-2"
            >
              Explore Features
            </a>
          </div>

          {/* Stats bar */}
          <div className="mt-20 grid grid-cols-3 gap-8 max-w-lg mx-auto">
            <div>
              <div className="text-2xl md:text-3xl font-bold text-white">8+</div>
              <div className="text-sm text-gray-500 mt-1">Core Features</div>
            </div>
            <div>
              <div className="text-2xl md:text-3xl font-bold text-white">Real-Time</div>
              <div className="text-sm text-gray-500 mt-1">Collaboration</div>
            </div>
            <div>
              <div className="text-2xl md:text-3xl font-bold text-white">AI</div>
              <div className="text-sm text-gray-500 mt-1">Powered</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-950/5 to-transparent pointer-events-none" />

        <div className="relative max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-indigo-400 text-sm font-semibold uppercase tracking-widest mb-3">
              Features
            </p>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
              Everything You Need to Succeed
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              A complete toolkit designed specifically for computer science students to learn,
              collaborate, and prepare for their careers.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="group relative p-6 rounded-2xl bg-[#16161d] border border-white/5 hover:border-indigo-500/30 transition-all duration-300 hover:-translate-y-1"
                >
                  <div className="w-11 h-11 rounded-xl bg-indigo-600/10 flex items-center justify-center mb-4 group-hover:bg-indigo-600/20 transition-colors">
                    <Icon className="w-5 h-5 text-indigo-400" />
                  </div>
                  <h3 className="text-base font-semibold mb-2 text-white">{feature.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-indigo-400 text-sm font-semibold uppercase tracking-widest mb-3">
              How It Works
            </p>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
              Get Started in Minutes
            </h2>
            <p className="text-gray-400 text-lg max-w-xl mx-auto">
              Three simple steps to join the CodeCord community.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-12 left-full w-full h-px bg-gradient-to-r from-indigo-500/30 to-transparent" />
                )}
                <div className="p-6">
                  <span className="text-5xl font-extrabold text-indigo-600/20">{step.number}</span>
                  <h3 className="text-xl font-semibold mt-2 mb-3 text-white">{step.title}</h3>
                  <p className="text-gray-400 leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center relative">
          <div className="absolute inset-0 bg-indigo-600/5 rounded-3xl blur-2xl pointer-events-none" />
          <div className="relative p-12 md:p-16 rounded-3xl bg-[#16161d] border border-white/5">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Level Up Your CSE Journey?
            </h2>
            <p className="text-gray-400 text-lg mb-8 max-w-xl mx-auto">
              Join CodeCord today and start collaborating with fellow CSE students using the most
              powerful academic communication platform.
            </p>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-semibold transition-all hover:shadow-lg hover:shadow-indigo-600/20"
            >
              Create Your Account
              <ChevronRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-10 mb-10">
            <div className="md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                  <Code2 className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-bold">CodeCord</span>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed">
                An AI-powered collaborative communication platform built for CSE students.
              </p>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
                Platform
              </h4>
              <ul className="space-y-2.5 text-sm text-gray-500">
                <li><a href="#features" className="hover:text-gray-300 transition-colors">Features</a></li>
                <li><a href="#how-it-works" className="hover:text-gray-300 transition-colors">How It Works</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
                Account
              </h4>
              <ul className="space-y-2.5 text-sm text-gray-500">
                <li><Link to="/login" className="hover:text-gray-300 transition-colors">Log In</Link></li>
                <li><Link to="/register" className="hover:text-gray-300 transition-colors">Sign Up</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
                Community
              </h4>
              <ul className="space-y-2.5 text-sm text-gray-500">
                <li className="hover:text-gray-300 transition-colors cursor-pointer">Discord</li>
                <li className="hover:text-gray-300 transition-colors cursor-pointer">GitHub</li>
                <li className="hover:text-gray-300 transition-colors cursor-pointer">Twitter</li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-600">
              &copy; {new Date().getFullYear()} CodeCord. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-sm text-gray-600">
              <span className="hover:text-gray-400 transition-colors cursor-pointer">Privacy Policy</span>
              <span className="hover:text-gray-400 transition-colors cursor-pointer">Terms of Service</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
