import { useState } from "react";
import { useAuth } from "../context/useAuth.jsx";
import { useNavigate } from "react-router-dom";
import {
  Code2,
  Hash,
  Volume2,
  Plus,
  ChevronDown,
  Settings,
  LogOut,
  Send,
  Smile,
  Paperclip,
  Mic,
  Headphones,
  BookOpen,
  Users,
  FileText,
  HelpCircle,
  Briefcase,
  Code,
} from "lucide-react";

const servers = [
  { id: 1, name: "Data Structures", icon: "DS", color: "bg-emerald-600" },
  { id: 2, name: "OOP", icon: "OOP", color: "bg-blue-600" },
  { id: 3, name: "DBMS", icon: "DB", color: "bg-amber-600" },
  { id: 4, name: "Operating Systems", icon: "OS", color: "bg-red-600" },
  { id: 5, name: "AI / ML", icon: "AI", color: "bg-purple-600" },
  { id: 6, name: "Web Development", icon: "WD", color: "bg-cyan-600" },
];

const channelCategories = [
  {
    name: "Information",
    channels: [
      { id: 1, name: "announcements", type: "text", icon: FileText },
      { id: 2, name: "resources", type: "text", icon: BookOpen },
    ],
  },
  {
    name: "Discussion",
    channels: [
      { id: 3, name: "general", type: "text", icon: Hash },
      { id: 4, name: "coding-help", type: "text", icon: Code },
      { id: 5, name: "assignment-help", type: "text", icon: HelpCircle },
    ],
  },
  {
    name: "Voice",
    channels: [
      { id: 6, name: "Study Room", type: "voice", icon: Volume2 },
      { id: 7, name: "Mock Interviews", type: "voice", icon: Briefcase },
    ],
  },
];

const sampleMessages = [
  {
    id: 1,
    user: "Arjun",
    avatar: "A",
    time: "Today at 10:32 AM",
    content: "Hey everyone, has anyone started the DSA assignment?",
  },
  {
    id: 2,
    user: "Priya",
    avatar: "P",
    time: "Today at 10:34 AM",
    content: "Yeah I finished the first 3 problems. The binary tree one was tricky.",
  },
  {
    id: 3,
    user: "Rahul",
    avatar: "R",
    time: "Today at 10:36 AM",
    content: 'Can someone explain the time complexity of this function?\n```\nfunction solve(n) {\n  if (n <= 1) return n;\n  return solve(n-1) + solve(n-2);\n}\n```',
  },
  {
    id: 4,
    user: "Priya",
    avatar: "P",
    time: "Today at 10:38 AM",
    content: "That's O(2^n) because it's making two recursive calls each time. You can optimize it with memoization to O(n).",
  },
];

const members = [
  { name: "Arjun", status: "online", role: "admin" },
  { name: "Priya", status: "online", role: "mod" },
  { name: "Rahul", status: "online", role: "member" },
  { name: "Sneha", status: "idle", role: "member" },
  { name: "Vikram", status: "offline", role: "member" },
];

export default function Home() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [selectedServer, setSelectedServer] = useState(servers[0]);
  const [selectedChannel, setSelectedChannel] = useState(channelCategories[1].channels[0]);
  const [messageInput, setMessageInput] = useState("");
  const [showMembers, setShowMembers] = useState(true);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="h-screen flex bg-[#0f0f14] text-gray-100 overflow-hidden">
      {/* Server Sidebar */}
      <div className="w-[72px] bg-[#0a0a0f] flex flex-col items-center py-3 gap-2 shrink-0">
        {/* Home button */}
        <button className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center hover:rounded-xl transition-all duration-200 mb-2">
          <Code2 className="w-6 h-6 text-white" />
        </button>
        <div className="w-8 h-0.5 bg-white/10 rounded-full mb-1" />

        {/* Server icons */}
        {servers.map((server) => (
          <button
            key={server.id}
            onClick={() => setSelectedServer(server)}
            className={`w-12 h-12 flex items-center justify-center text-xs font-bold text-white transition-all duration-200 group relative ${
              selectedServer.id === server.id
                ? "rounded-xl " + server.color
                : "rounded-2xl bg-[#1e1e28] hover:rounded-xl hover:" + server.color
            }`}
          >
            {server.icon}
            {/* Tooltip */}
            <span className="absolute left-full ml-3 px-3 py-1.5 bg-[#1e1e28] text-white text-sm font-medium rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-xl z-50">
              {server.name}
            </span>
            {/* Active indicator */}
            {selectedServer.id === server.id && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-[7px] w-1 h-8 bg-white rounded-r-full" />
            )}
          </button>
        ))}

        {/* Add server button */}
        <button className="w-12 h-12 rounded-2xl bg-[#1e1e28] hover:bg-emerald-600 hover:rounded-xl flex items-center justify-center transition-all duration-200 mt-1">
          <Plus className="w-5 h-5 text-emerald-400" />
        </button>
      </div>

      {/* Channel Sidebar */}
      <div className="w-60 bg-[#16161d] flex flex-col shrink-0">
        {/* Server Header */}
        <div className="h-12 px-4 flex items-center justify-between border-b border-white/5 shadow-sm cursor-pointer hover:bg-white/5 transition-colors">
          <h2 className="font-semibold text-sm text-white truncate">{selectedServer.name}</h2>
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </div>

        {/* Channel List */}
        <div className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
          {channelCategories.map((category) => (
            <div key={category.name}>
              <div className="flex items-center gap-0.5 px-1 mb-1">
                <ChevronDown className="w-3 h-3 text-gray-500" />
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                  {category.name}
                </span>
              </div>
              <div className="space-y-0.5">
                {category.channels.map((channel) => {
                  const Icon = channel.icon;
                  return (
                    <button
                      key={channel.id}
                      onClick={() => setSelectedChannel(channel)}
                      className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-sm transition-colors ${
                        selectedChannel.id === channel.id
                          ? "bg-white/10 text-white"
                          : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{channel.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* User Panel */}
        <div className="h-14 bg-[#111118] px-2 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold shrink-0">
              {user?.username?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.username || "User"}
              </p>
              <p className="text-[11px] text-gray-500 truncate">Online</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-gray-200 transition-colors">
              <Mic className="w-4 h-4" />
            </button>
            <button className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-gray-200 transition-colors">
              <Headphones className="w-4 h-4" />
            </button>
            <button className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-gray-200 transition-colors">
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Channel Header */}
        <div className="h-12 px-4 flex items-center justify-between border-b border-white/5 shadow-sm shrink-0">
          <div className="flex items-center gap-2">
            <Hash className="w-4 h-4 text-gray-400" />
            <span className="font-semibold text-sm text-white">{selectedChannel.name}</span>
            <div className="hidden md:block w-px h-5 bg-white/10 mx-2" />
            <span className="hidden md:block text-xs text-gray-500 truncate">
              Welcome to #{selectedChannel.name}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowMembers(!showMembers)}
              className={`p-1.5 rounded transition-colors ${
                showMembers ? "text-white bg-white/10" : "text-gray-400 hover:text-gray-200"
              }`}
            >
              <Users className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 flex min-h-0">
          {/* Messages Area */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {/* Welcome message */}
              <div className="pb-4 mb-4 border-b border-white/5">
                <div className="w-16 h-16 rounded-full bg-[#1e1e28] flex items-center justify-center mb-4">
                  <Hash className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-1">
                  Welcome to #{selectedChannel.name}
                </h3>
                <p className="text-gray-400 text-sm">
                  This is the start of the #{selectedChannel.name} channel.
                </p>
              </div>

              {/* Sample messages */}
              {sampleMessages.map((msg) => (
                <div key={msg.id} className="flex gap-3 group hover:bg-white/[0.02] rounded-lg p-2 -mx-2 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-indigo-600/20 flex items-center justify-center text-sm font-bold text-indigo-400 shrink-0">
                    {msg.avatar}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="font-semibold text-sm text-white">{msg.user}</span>
                      <span className="text-[11px] text-gray-500">{msg.time}</span>
                    </div>
                    <div className="text-sm text-gray-300 mt-0.5 whitespace-pre-wrap break-words">
                      {msg.content.includes("```") ? (
                        <>
                          {msg.content.split("```")[0]}
                          <pre className="mt-1 p-3 bg-[#0f0f14] border border-white/5 rounded-lg text-xs font-mono text-indigo-300 overflow-x-auto">
                            {msg.content.split("```")[1].replace(/^\n/, "")}
                          </pre>
                        </>
                      ) : (
                        msg.content
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Message Input */}
            <div className="px-4 pb-6 pt-2 shrink-0">
              <div className="bg-[#1e1e28] rounded-xl flex items-center px-4 gap-2">
                <button className="p-2 text-gray-400 hover:text-gray-200 transition-colors shrink-0">
                  <Plus className="w-5 h-5" />
                </button>
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder={`Message #${selectedChannel.name}`}
                  className="flex-1 bg-transparent py-3 text-sm text-white placeholder-gray-500 focus:outline-none min-w-0"
                />
                <button className="p-2 text-gray-400 hover:text-gray-200 transition-colors shrink-0">
                  <Paperclip className="w-5 h-5" />
                </button>
                <button className="p-2 text-gray-400 hover:text-gray-200 transition-colors shrink-0">
                  <Smile className="w-5 h-5" />
                </button>
                <button className="p-2 text-indigo-400 hover:text-indigo-300 transition-colors shrink-0">
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Members Sidebar */}
          {showMembers && (
            <div className="w-60 bg-[#16161d] border-l border-white/5 p-3 overflow-y-auto shrink-0 hidden lg:block">
              <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide px-2 mb-2">
                Online -- {members.filter((m) => m.status === "online").length}
              </h3>
              <div className="space-y-0.5 mb-4">
                {members
                  .filter((m) => m.status === "online")
                  .map((member) => (
                    <div
                      key={member.name}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/5 cursor-pointer transition-colors"
                    >
                      <div className="relative">
                        <div className="w-8 h-8 rounded-full bg-indigo-600/20 flex items-center justify-center text-xs font-bold text-indigo-400">
                          {member.name.charAt(0)}
                        </div>
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#16161d]" />
                      </div>
                      <span
                        className={`text-sm truncate ${
                          member.role === "admin"
                            ? "text-amber-400"
                            : member.role === "mod"
                            ? "text-blue-400"
                            : "text-gray-300"
                        }`}
                      >
                        {member.name}
                      </span>
                    </div>
                  ))}
              </div>

              <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide px-2 mb-2">
                Idle -- {members.filter((m) => m.status === "idle").length}
              </h3>
              <div className="space-y-0.5 mb-4">
                {members
                  .filter((m) => m.status === "idle")
                  .map((member) => (
                    <div
                      key={member.name}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/5 cursor-pointer transition-colors"
                    >
                      <div className="relative">
                        <div className="w-8 h-8 rounded-full bg-indigo-600/20 flex items-center justify-center text-xs font-bold text-indigo-400">
                          {member.name.charAt(0)}
                        </div>
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-amber-500 border-2 border-[#16161d]" />
                      </div>
                      <span className="text-sm text-gray-400 truncate">{member.name}</span>
                    </div>
                  ))}
              </div>

              <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide px-2 mb-2">
                Offline -- {members.filter((m) => m.status === "offline").length}
              </h3>
              <div className="space-y-0.5">
                {members
                  .filter((m) => m.status === "offline")
                  .map((member) => (
                    <div
                      key={member.name}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/5 cursor-pointer transition-colors opacity-40"
                    >
                      <div className="relative">
                        <div className="w-8 h-8 rounded-full bg-indigo-600/20 flex items-center justify-center text-xs font-bold text-indigo-400">
                          {member.name.charAt(0)}
                        </div>
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-gray-500 border-2 border-[#16161d]" />
                      </div>
                      <span className="text-sm text-gray-400 truncate">{member.name}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
