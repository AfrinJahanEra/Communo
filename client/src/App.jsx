import { Navigate, Route, Routes } from "react-router-dom";
import { RedirectIfAuth, RequireAuth } from "./components/RouteGuards";
import AppLayout from "./layouts/AppLayout";
import HomeLayout from "./layouts/HomeLayout";
import ServerLayout from "./layouts/ServerLayout";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import FriendsPage from "./pages/FriendsPage";
import DmPage from "./pages/DmPage";
import DiscoverPage from "./pages/DiscoverPage";
import InvitePage from "./pages/InvitePage";
import ServerIndex from "./pages/ServerIndex";
import ChannelPage from "./pages/ChannelPage";
import IdePage from "./pages/IdePage";
import StudyPage from "./pages/StudyPage";

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
    <Route
      path="/invite/:code"
      element={
        <RequireAuth>
          <InvitePage />
        </RequireAuth>
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
