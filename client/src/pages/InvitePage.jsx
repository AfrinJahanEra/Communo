import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MailX, Users } from "lucide-react";
import { Button } from "../components/ui/Button";
import { LoadingScreen } from "../components/ui/Spinner";
import { apiMessage } from "../lib/api";
import { initials } from "../lib/utils";
import { joinByInvite, previewInvite } from "../services/serverService";

/** Standalone invite landing: preview the server, then join. */
const InvitePage = () => {
  const { code } = useParams();
  const navigate = useNavigate();

  const [invite, setInvite] = useState(null);
  const [error, setError] = useState(null);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState(null);

  useEffect(() => {
    let alive = true;
    previewInvite(code)
      .then((inv) => alive && setInvite(inv))
      .catch((err) => alive && setError(apiMessage(err, "Invite not found or expired")));
    return () => {
      alive = false;
    };
  }, [code]);

  const join = async () => {
    setJoining(true);
    setJoinError(null);
    try {
      await joinByInvite(code);
      navigate(`/app/servers/${invite.server._id}`, { replace: true });
    } catch (err) {
      // Already a member? Just take them there.
      if (err.response?.status === 409) {
        navigate(`/app/servers/${invite.server._id}`, { replace: true });
        return;
      }
      setJoinError(apiMessage(err, "Could not join this server"));
      setJoining(false);
    }
  };

  if (!invite && !error) return <LoadingScreen label="Checking invite…" />;

  return (
    <div className="flex min-h-dvh items-center justify-center bg-cream-100 px-4">
      <div className="card w-full max-w-sm p-8 text-center">
        {error ? (
          <>
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-cream-200 text-ink-300">
              <MailX size={28} />
            </span>
            <h1 className="mt-4 text-lg font-extrabold text-ink-900">Invite invalid</h1>
            <p className="mt-1.5 text-sm text-ink-500">{error}</p>
            <Button className="mt-6 w-full" onClick={() => navigate("/app")}>
              Back to Communo
            </Button>
          </>
        ) : (
          <>
            <p className="text-xs font-bold uppercase tracking-widest text-lav-600">
              {invite.alreadyMember ? "You're already in this server" : "You've been invited to join"}
            </p>
            {invite.server.icon ? (
              <img
                src={invite.server.icon}
                alt={invite.server.name}
                className="mx-auto mt-4 h-16 w-16 rounded-3xl object-cover"
              />
            ) : (
              <span className="mx-auto mt-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-lav-200 text-xl font-bold text-lav-800">
                {initials(invite.server.name)}
              </span>
            )}
            <h1 className="mt-3 text-xl font-extrabold text-ink-900">{invite.server.name}</h1>
            {invite.server.description && (
              <p className="mt-1.5 text-sm leading-relaxed text-ink-500">
                {invite.server.description}
              </p>
            )}
            <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-ink-300">
              <Users size={13} />
              {invite.server.memberCount} member{invite.server.memberCount === 1 ? "" : "s"}
            </p>

            {joinError && (
              <p className="mt-4 rounded-xl bg-status-dnd/10 px-3 py-2 text-xs text-status-dnd">
                {joinError}
              </p>
            )}

            {invite.alreadyMember && (
              <p className="mt-3 text-sm text-ink-500">You can open the server directly from here.</p>
            )}

            <Button
              className="mt-6 w-full"
              loading={joining}
              onClick={() => {
                if (invite?.alreadyMember) {
                  navigate(`/app/servers/${invite.server._id}`, { replace: true });
                  return;
                }
                void join();
              }}
            >
              {invite?.alreadyMember ? "Open server" : "Accept invite"}
            </Button>
            <Link
              to="/app"
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-ink-300 transition hover:text-lav-700"
            >
              <ArrowLeft size={13} /> No thanks, back to app
            </Link>
          </>
        )}
      </div>
    </div>
  );
};

export default InvitePage;
