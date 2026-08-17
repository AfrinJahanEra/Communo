import { Navigate, Route, Routes } from "react-router-dom";
import { RequireAuth } from "./components/RouteGuards";
import { LoadingScreen } from "./components/ui/Spinner";
import { useAuth } from "./hooks/useAuth";
import AppLayout from "./layouts/AppLayout";
import HomeLayout from "./layouts/HomeLayout";
import ServerLayout from "./layouts/ServerLayout";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import CheckEmail from "./pages/CheckEmail";
import VerifyEmail from "./pages/VerifyEmail";
import FriendsPage from "./pages/FriendsPage";
import DmPage from "./pages/DmPage";
import DiscoverPage from "./pages/DiscoverPage";
import InvitePage from "./pages/InvitePage";
import ServerIndex from "./pages/ServerIndex";
import ChannelPage from "./pages/ChannelPage";
import IdePage from "./pages/IdePage";
import StudyPage from "./pages/StudyPage";
import AdminPage from "./pages/AdminPage";
import AdminLogin from "./pages/AdminLogin";

/**
 * Hidden admin entry: /admin shows the console to admins and a secret-key
 * login form to everyone else — there is no link to it anywhere in the UI.
 */
const AdminEntry = () => {
  const { user, booting } = useAuth();
  if (booting) return <LoadingScreen label="Signing you in…" />;
  return user?.role === "admin" ? <AdminPage /> : <AdminLogin />;
};

const App = () => (
  <Routes>
    <Route path="/" element={<Landing />} />
    {/*
      Deliberately unguarded: the login/register pages must always be
      reachable so a signed-in browser can switch accounts.
      Submitting the form simply replaces the current session.
    */}
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />

    {/*
      Deliberately unguarded: the moment verification succeeds a session
      appears, and a guard would bounce the user away before the success
      state could render.
    */}
    <Route path="/check-email" element={<CheckEmail />} />
    <Route path="/verify-email" element={<VerifyEmail />} />

    <Route
      path="/invite/:code"
      element={
        <RequireAuth>
          <InvitePage />
        </RequireAuth>
      }
    />

    {/* Platform admin console: hidden URL, shows its own secret-key login */}
    <Route path="/admin" element={<AdminEntry />} />

    <Route
      path="/app"
      element={
        <RequireAuth>
          <AppLayout />
        </RequireAuth>
      }
    >
      <Route element={<HomeLayout />}>
        <Route index element={<FriendsPage />} />
        <Route path="dms/:dmId" element={<DmPage />} />
      </Route>
      <Route path="discover" element={<DiscoverPage />} />
      <Route path="servers/:serverId" element={<ServerLayout />}>
        <Route index element={<ServerIndex />} />
        <Route path="channels/:channelId" element={<ChannelPage />} />
        <Route path="ide" element={<IdePage />} />
        <Route path="study" element={<StudyPage />} />
      </Route>
    </Route>

    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

export default App;