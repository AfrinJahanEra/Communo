import { Navigate, Route, Routes } from "react-router-dom";
import { RedirectIfAuth, RequireAuth, RequireAdmin } from "./components/RouteGuards";
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

const App = () => (
  <Routes>
    <Route path="/" element={<Landing />} />
    <Route
      path="/login"
      element={
        <RedirectIfAuth>
          <Login />
        </RedirectIfAuth>
      }
    />
    <Route
      path="/register"
      element={
        <RedirectIfAuth>
          <Register />
        </RedirectIfAuth>
      }
    />

    {/*
      Deliberately unguarded. RedirectIfAuth would bounce the user away from
      /verify-email the moment verification succeeds and a session appears,
      before the success state could render.
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

    {/* Platform admin console: separate entry, admin role only */}
    <Route
      path="/admin"
      element={
        <RequireAdmin>
          <AdminPage />
        </RequireAdmin>
      }
    />

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