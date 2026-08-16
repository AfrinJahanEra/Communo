import { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext, useParams } from "react-router-dom";
import { Hash, ListChecks, Megaphone, MessagesSquare, Pin, Sparkles, Volume2 } from "lucide-react";
import { ChatHeader, HeaderButton } from "../components/chat/ChatHeader";
import { ChatPane } from "../components/chat/ChatPane";
import { PinsPanel } from "../components/chat/PinsPanel";
import { ThreadPanel } from "../components/chat/ThreadPanel";
import { SummaryPanel } from "../components/chat/SummaryPanel";
import { CreatePollModal } from "../components/chat/CreatePollModal";
import { PollVoteModal } from "../components/chat/PollVoteModal";
import { PollVotersModal } from "../components/chat/PollVotersModal";
import { MemberList } from "../components/server/MemberList";
import { VoiceRoom } from "../components/voice/VoiceRoom";
import { EmptyState } from "../components/ui/EmptyState";
import { useChat } from "../hooks/useChat";
import { useAuth } from "../hooks/useAuth";
import { hasPermission, PERMISSIONS } from "../lib/permissions";
import { apiMessage } from "../lib/api";
import { idOf } from "../lib/utils";
import { listChannelPins, markChannelRead, summarizeChannel } from "../services/channelService";

/** Resolves poll voter ids back to user objects via the already-loaded member list. */
const resolveVoters = (voterIds, members) => {
  const byId = new Map(members.map((m) => [idOf(m.userId), m.userId]));
  return (voterIds || []).map((id) => byId.get(idOf(id))).filter(Boolean);
};

const CHANNEL_ICONS = { text: Hash, announcement: Megaphone, voice: Volume2 };

/** One channel: text/announcement → chat + threads + pins, voice → study room. */
const ChannelPage = () => {
  const { channelId } = useParams();
  const { server, channels, members, myPermissions, openSidebar } = useOutletContext();
  const { user } = useAuth();

  const channel = useMemo(
    () => channels.find((c) => c._id === channelId),
    [channels, channelId]
  );

  const [pinsOpen, setPinsOpen] = useState(false);
  const [threadsOpen, setThreadsOpen] = useState(false);
  const [threadStart, setThreadStart] = useState(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryRequestId, setSummaryRequestId] = useState(0);
  const [pollModal, setPollModal] = useState(null); // { mode: "create" | "edit", message? }
  const [pollVoteMessage, setPollVoteMessage] = useState(null);
  const [pollVoters, setPollVoters] = useState(null); // { option, voters }

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

  const onVotePoll = (message) => setPollVoteMessage(message);

  const onOpenPollVoters = (message, option) => {
    setPollVoters({ option, voters: resolveVoters(option.voterIds, members) });
  };

  const onEditPoll = (message) => setPollModal({ mode: "edit", message });

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
            icon={ListChecks}
            label="Create poll"
            onClick={() => setPollModal({ mode: "create" })}
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
          onVotePoll={onVotePoll}
          onOpenPollVoters={onOpenPollVoters}
          onEditPoll={onEditPoll}
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

      <CreatePollModal
        open={pollModal?.mode === "create"}
        onClose={() => setPollModal(null)}
        title="Create Poll"
        submitLabel="Post"
        onSubmit={async ({ question, options }) => {
          try {
            await chat.send("", [], { question, options });
          } catch (err) {
            throw new Error(apiMessage(err, err.message), { cause: err });
          }
        }}
      />
      <CreatePollModal
        open={pollModal?.mode === "edit"}
        onClose={() => setPollModal(null)}
        title="Edit Poll"
        submitLabel="Save"
        initialQuestion={pollModal?.message?.poll?.question || ""}
        initialOptions={pollModal?.message?.poll?.options?.map((o) => o.text) || []}
        onSubmit={async ({ question, options }) => {
          try {
            await chat.editPoll(idOf(pollModal.message._id), { question, options });
          } catch (err) {
            throw new Error(apiMessage(err, err.message), { cause: err });
          }
        }}
      />
      <PollVoteModal
        open={Boolean(pollVoteMessage)}
        onClose={() => setPollVoteMessage(null)}
        message={pollVoteMessage}
        viewerId={idOf(user?._id)}
        onSubmit={(optionId) => chat.votePoll(idOf(pollVoteMessage._id), optionId)}
      />
      <PollVotersModal
        open={Boolean(pollVoters)}
        onClose={() => setPollVoters(null)}
        option={pollVoters?.option}
        voters={pollVoters?.voters}
      />
    </div>
  );
};

export default ChannelPage;
