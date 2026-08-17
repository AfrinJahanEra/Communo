import { useCallback, useEffect, useRef, useState } from "react";
import { Headphones, LogOut, Mic, MicOff, RefreshCw, Volume2 } from "lucide-react";
import { ChatHeader, HeaderButton } from "../chat/ChatHeader";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";
import { useAuth } from "../../hooks/useAuth";
import { useSocketEvent } from "../../hooks/useSocket";
import { useToast } from "../../hooks/useToast";
import { emitAck } from "../../lib/socket";
import { cn, displayNameOf, idOf } from "../../lib/utils";
import { hasPermission, PERMISSIONS } from "../../lib/permissions";
import { getVoiceParticipants } from "../../services/channelService";

/**
 * STUN discovers public addresses; on LAN that is enough, but across mobile
 * networks / symmetric NATs a direct path often cannot be punched — set the
 * VITE_TURN_* env vars (e.g. from metered.ca) to relay media in that case.
 */
const buildIceServers = () => {
  const servers = [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }];
  const turnUrl = import.meta.env.VITE_TURN_URL;
  if (turnUrl) {
    servers.push({
      urls: turnUrl,
      username: import.meta.env.VITE_TURN_USERNAME || "",
      credential: import.meta.env.VITE_TURN_CREDENTIAL || "",
    });
  }
  return servers;
};

const RTC_CONFIG = { iceServers: buildIceServers() };

/** Hidden element that plays one peer's remote audio stream. */
const AudioSink = ({ stream }) => {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current && stream) ref.current.srcObject = stream;
  }, [stream]);
  return <audio ref={ref} autoPlay playsInline />;
};

const ParticipantCard = ({ participant, isMe }) => (
  <div
    className={cn(
      "flex flex-col items-center gap-2 rounded-2xl border bg-white p-4 shadow-sm transition",
      isMe ? "border-lav-400 ring-2 ring-lav-200" : "border-cream-300"
    )}
  >
    <Avatar user={participant} size="lg" />
    <p className="max-w-full truncate text-sm font-semibold text-ink-900">
      {displayNameOf(participant)}
      {isMe && <span className="text-ink-300"> (you)</span>}
    </p>
    <span
      className={cn(
        "flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
        participant.muted ? "bg-status-dnd/10 text-status-dnd" : "bg-status-online/10 text-status-online"
      )}
    >
      {participant.muted ? <MicOff size={10} /> : <Mic size={10} />}
      {participant.muted ? "Muted" : "Live"}
    </span>
  </div>
);

/**
 * Voice study room: WebRTC audio mesh over the backend's voice:* signaling.
 * The joiner offers to everyone already in the room; existing peers answer.
 */
export const VoiceRoom = ({ channel, myPermissions, onOpenSidebar }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const canConnect = hasPermission(myPermissions, PERMISSIONS.CONNECT_VOICE);

  const [joined, setJoined] = useState(false);
  const [joining, setJoining] = useState(false);
  const [muted, setMuted] = useState(false);
  const [participants, setParticipants] = useState([]); // public roster
  const [streams, setStreams] = useState({}); // userId -> MediaStream

  const localStream = useRef(null);
  const peers = useRef(new Map()); // userId -> RTCPeerConnection
  const joinedRef = useRef(false);

  const refreshRoster = useCallback(() => {
    getVoiceParticipants(channel._id)
      .then(setParticipants)
      .catch(() => {});
  }, [channel._id]);

  useEffect(() => {
    refreshRoster();
  }, [refreshRoster]);

  // ---- peer helpers ----

  const closePeer = useCallback((userId) => {
    const pc = peers.current.get(userId);
    if (pc) {
      pc.onicecandidate = null;
      pc.ontrack = null;
      pc.close();
      peers.current.delete(userId);
    }
    setStreams((prev) => {
      if (!(userId in prev)) return prev;
      const next = { ...prev };
      delete next[userId];
      return next;
    });
  }, []);

  const createPeer = useCallback(
    (targetUserId) => {
      const pc = new RTCPeerConnection(RTC_CONFIG);
      peers.current.set(targetUserId, pc);
      localStream.current
        ?.getTracks()
        .forEach((track) => pc.addTrack(track, localStream.current));
      pc.onicecandidate = (e) => {
        if (e.candidate) {
          emitAck("voice:signal", { targetUserId, data: { candidate: e.candidate.toJSON() } });
        }
      };
      // Surface NAT/firewall failures instead of silently staying mute
      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === "failed") {
          toast({
            type: "error",
            title: "Voice connection failed",
            body: "A direct audio path could not be established. On different networks a TURN relay may be required.",
          });
        }
      };
      pc.ontrack = (e) => {
        const [stream] = e.streams;
        setStreams((prev) => ({ ...prev, [targetUserId]: stream }));
      };
      return pc;
    },
    [toast]
  );

  const leave = useCallback(async ({ notifyServer = true } = {}) => {
    if (notifyServer && joinedRef.current) await emitAck("voice:leave", {});
    joinedRef.current = false;
    for (const userId of [...peers.current.keys()]) closePeer(userId);
    localStream.current?.getTracks().forEach((t) => t.stop());
    localStream.current = null;
    setJoined(false);
    setMuted(false);
    setStreams({});
    refreshRoster();
  }, [closePeer, refreshRoster]);

  // Leaving the page/channel frees the slot.
  useEffect(() => {
    const peerMap = peers.current;
    return () => {
      if (joinedRef.current) {
        emitAck("voice:leave", {});
        for (const pc of peerMap.values()) pc.close();
        peerMap.clear();
        localStream.current?.getTracks().forEach((t) => t.stop());
        localStream.current = null;
        joinedRef.current = false;
      }
    };
  }, [channel._id]);

  // ---- join flow ----

  const join = async () => {
    if (joining || joined) return;
    setJoining(true);
    try {
      localStream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      toast({
        type: "error",
        title: "Microphone unavailable",
        body: "Allow microphone access in your browser to join voice rooms.",
      });
      setJoining(false);
      return;
    }
    const ack = await emitAck("voice:join", { channelId: channel._id });
    if (!ack.success) {
      localStream.current?.getTracks().forEach((t) => t.stop());
      localStream.current = null;
      toast({ type: "error", title: "Could not join", body: ack.message });
      setJoining(false);
      return;
    }
    joinedRef.current = true;
    setJoined(true);
    setParticipants(ack.participants);
    // Offer to everyone already in the room (they answer).
    const others = ack.participants.filter((p) => idOf(p.userId) !== String(user._id));
    for (const p of others) {
      const targetUserId = idOf(p.userId);
      const pc = createPeer(targetUserId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await emitAck("voice:signal", { targetUserId, data: { sdp: pc.localDescription } });
    }
    setJoining(false);
  };

  const toggleMute = async () => {
    const next = !muted;
    localStream.current?.getAudioTracks().forEach((t) => {
      t.enabled = !next;
    });
    setMuted(next);
    setParticipants((prev) =>
      prev.map((p) => (idOf(p.userId) === String(user._id) ? { ...p, muted: next } : p))
    );
    await emitAck("voice:mute", { muted: next });
  };

  // ---- signaling ----

  useSocketEvent(
    "voice:signal",
    async ({ channelId, fromUserId, data }) => {
      if (idOf(channelId) !== channel._id || !joinedRef.current) return;
      const from = idOf(fromUserId);
      let pc = peers.current.get(from);
      try {
        if (data?.sdp) {
          if (data.sdp.type === "offer") {
            if (!pc) pc = createPeer(from);
            await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await emitAck("voice:signal", {
              targetUserId: from,
              data: { sdp: pc.localDescription },
            });
          } else if (data.sdp.type === "answer" && pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
          }
        } else if (data?.candidate && pc) {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
      } catch {
        /* a dropped signal only degrades that one peer link */
      }
    },
    [channel._id, createPeer]
  );

  useSocketEvent(
    "voice:user-joined",
    ({ channelId, participant }) => {
      if (idOf(channelId) !== channel._id) return;
      setParticipants((prev) => {
        const uid = idOf(participant.userId);
        return [...prev.filter((p) => idOf(p.userId) !== uid), participant];
      });
    },
    [channel._id]
  );

  useSocketEvent(
    "voice:user-left",
    ({ channelId, userId }) => {
      if (idOf(channelId) !== channel._id) return;
      const uid = idOf(userId);
      closePeer(uid);
      setParticipants((prev) => prev.filter((p) => idOf(p.userId) !== uid));
    },
    [channel._id, closePeer]
  );

  useSocketEvent(
    "voice:state",
    ({ channelId, userId, muted: isMuted }) => {
      if (idOf(channelId) !== channel._id) return;
      const uid = idOf(userId);
      setParticipants((prev) =>
        prev.map((p) => (idOf(p.userId) === uid ? { ...p, muted: isMuted } : p))
      );
    },
    [channel._id]
  );

  const roster = participants.map((p) => ({ ...p, _id: idOf(p.userId) }));

  return (
    <div className="flex h-full min-h-0 flex-col bg-cream-50">
      <ChatHeader
        icon={Volume2}
        title={channel.name}
        subtitle={
          channel.userLimit > 0
            ? `Voice study room · up to ${channel.userLimit} people`
            : "Voice study room"
        }
        onOpenSidebar={onOpenSidebar}
      >
        {!joined && <HeaderButton icon={RefreshCw} label="Refresh" onClick={refreshRoster} />}
      </ChatHeader>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {roster.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-lav-100 text-lav-500">
              <Headphones size={30} />
            </span>
            <p className="text-sm font-semibold text-ink-700">The room is quiet</p>
            <p className="max-w-xs text-xs text-ink-500">
              Join the study room and your classmates will see you here.
            </p>
          </div>
        ) : (
          <div className="mx-auto grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {roster.map((p) => (
              <ParticipantCard key={p._id} participant={p} isMe={p._id === String(user._id)} />
            ))}
          </div>
        )}
      </div>

      {/* remote audio */}
      {Object.entries(streams).map(([uid, stream]) => (
        <AudioSink key={uid} stream={stream} />
      ))}

      <div className="flex items-center justify-center gap-3 border-t border-cream-300 bg-cream-100/70 px-4 py-4">
        {!joined ? (
          <Button onClick={join} loading={joining} disabled={!canConnect} size="lg">
            <Headphones size={17} />
            {canConnect ? "Join study room" : "No permission to connect"}
          </Button>
        ) : (
          <>
            <button
              onClick={toggleMute}
              title={muted ? "Unmute" : "Mute"}
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-2xl transition",
                muted
                  ? "bg-status-dnd text-white"
                  : "border border-cream-300 bg-white text-ink-700 hover:bg-cream-200"
              )}
            >
              {muted ? <MicOff size={19} /> : <Mic size={19} />}
            </button>
            <button
              onClick={() => leave()}
              title="Leave voice"
              className="flex h-12 items-center gap-2 rounded-2xl bg-status-dnd px-5 font-semibold text-white transition hover:brightness-110"
            >
              <LogOut size={17} /> Leave
            </button>
          </>
        )}
      </div>
    </div>
  );
};
