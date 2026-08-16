import { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext, useParams } from "react-router-dom";
import { Hash, Megaphone, MessagesSquare, Pin, Sparkles, Volume2 } from "lucide-react";
import { ChatHeader, HeaderButton } from "../components/chat/ChatHeader";
import { ChatPane } from "../components/chat/ChatPane";
import { PinsPanel } from "../components/chat/PinsPanel";
import { ThreadPanel } from "../components/chat/ThreadPanel";
import { SummaryPanel } from "../components/chat/SummaryPanel";
import { MemberList } from "../components/server/MemberList";
import { VoiceRoom } from "../components/voice/VoiceRoom";
import { EmptyState } from "../components/ui/EmptyState";
import { useChat } from "../hooks/useChat";
import { hasPermission, PERMISSIONS } from "../lib/permissions";
import { listChannelPins, markChannelRead, summarizeChannel } from "../services/channelService";

const CHANNEL_ICONS = { text: Hash, announcement: Megaphone, voice: Volume2 };

/** One channel: text/announcement → chat + threads + pins, voice → study room. */
const ChannelPage = () => {
  const { channelId } = useParams();
  const { server, channels, members, myPermissions, openSidebar } = useOutletContext();

  const channel = useMemo(
    () => channels.find((c) => c._id === channelId),
    [channels, channelId]
  );

  const [pinsOpen, setPinsOpen] = useState(false);
  const [threadsOpen, setThreadsOpen] = useState(false);
  const [threadStart, setThreadStart] = useState(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryRequestId, setSummaryRequestId] = useState(0);

  const chat = useChat("channel", channel && channel.type !== "voice" ? channelId : null);

  useEffect(() => {
    if (!channel || channel.type === "voice") return undefined;
    markChannelRead(channel._id).catch(() => {});
    return undefined;
  }, [channel, chat.messages.length]);

  const fetchPins = useCallback(() => listChannelPins(channelId), [channelId]);

  if (!channel) {
    return (
      <EmptyState
        icon={Hash}
        title="Channel not found"
        body="It may have been deleted, or you may not have access to it."
        className="h-full"
      />
    );
  }

  if (channel.type === "voice") {
    return (
      <VoiceRoom
        key={channel._id}
        channel={channel}
        myPermissions={myPermissions}
        onOpenSidebar={openSidebar}
      />
    );
  }

  const Icon = CHANNEL_ICONS[channel.type] || Hash;
  const canManageMessages = hasPermission(myPermissions, PERMISSIONS.MANAGE_MESSAGES);
  const canSend =
    channel.type === "announcement"
      ? canManageMessages
      : hasPermission(myPermissions, PERMISSIONS.SEND_MESSAGES);

  const onStartThread = (message) => {
    setThreadStart(message);
    setThreadsOpen(true);
  };

  const onSummarize = () => {
    setSummaryOpen(true);
    setSummaryRequestId((n) => n + 1);
  };

  return (
    <div className="relative flex h-full min-h-0">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <ChatHeader
          icon={Icon}
          title={channel.name}
          subtitle={channel.topic}
          onOpenSidebar={openSidebar}
        >
          <HeaderButton
            icon={Pin}
            label="Pinned messages"
            active={pinsOpen}
            onClick={() => setPinsOpen((o) => !o)}
          />
          <HeaderButton
            icon={MessagesSquare}
            label="Threads"
            active={threadsOpen}
            onClick={() => {
              setSummaryOpen(false);
              setThreadStart(null);
              setThreadsOpen((o) => !o);
            }}
          />
          <HeaderButton
            icon={Sparkles}
            label="Summarize chat"
            active={summaryOpen}
            onClick={() => {
              setThreadsOpen(false);
              onSummarize();
            }}
          />
        </ChatHeader>

        {pinsOpen && <PinsPanel fetchPins={fetchPins} onClose={() => setPinsOpen(false)} />}

        <ChatPane
          chat={chat}
          placeholder={`Message #${channel.name}`}
          canManage={canManageMessages}
          canPin={canManageMessages}
          canSend={canSend}
          sendDisabledHint={
            channel.type === "announcement"
              ? "Only moderators can post in announcement channels."
              : "You do not have permission to send messages here."
          }
          onStartThread={onStartThread}
          onSummarize={onSummarize}
          emptyTitle={`Welcome to #${channel.name}`}
          emptyBody={channel.topic || "This is the start of the channel."}
        />
      </div>

      {threadsOpen && (
        <ThreadPanel
          channel={channel}
          myPermissions={myPermissions}
          startFromMessage={threadStart}
          onClose={() => {
            setThreadsOpen(false);
            setThreadStart(null);
          }}
        />
      )}

      {summaryOpen && (
        <SummaryPanel
          id={channel._id}
          title={`#${channel.name}`}
          fetchSummary={summarizeChannel}
          requestId={summaryRequestId}
          onClose={() => setSummaryOpen(false)}
        />
      )}

      {!threadsOpen && !summaryOpen && <MemberList server={server} members={members} />}
    </div>
  );
};

export default ChannelPage;
