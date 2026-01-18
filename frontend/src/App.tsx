import { useState, useEffect } from "react";
import { FrontPage } from "./pages/front-page/FrontPage";
import { MainMenu } from "./pages/main-menu/MainMenu";
import { Routes, Route, Navigate } from "react-router-dom";
import { Footer } from "./shared/Footer";
import styled from "styled-components";
import { GamePage } from "./pages/game/1v1-game/components/GamePage";
import { ProfilePage } from "./pages/profile/ProfilePage";
import { LoginPage } from "./pages/user/components/LoginPage";
import { RegisterPage } from "./pages/user/components/RegisterPage";
import { TournamentLobbyPage } from "./pages/game/tournament/TournamentLobbyPage";
import { TournamentQueuePage } from "./pages/game/tournament/TournamentQueuePage";
import { Header } from "./shared/Header";
import { useAuth } from "./AuthProvider";
import { GoogleCallbackHandler } from "./pages/user/handlers/GoogleCallbackHandler";
import { TournamentMatchPage } from "./pages/game/tournament/TournamentMatchPage";
import { PrivacyPolicyPage } from "./pages/legal/privacy-policy/PrivacyPolicyPage";
import { TermsOfServicePage } from "./pages/legal/terms-of-service/TermsOfServicePage";
import { GameLobbyPage } from "./pages/game/1v1-game/components/GameLobbyPage";
import { GameQueuePage } from "./pages/game/1v1-game/components/GameQueuePage";
import { RequireAuth } from "./RequireAuth";

const Root = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
`;

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  const updateTheme = (isDark: boolean) => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem("pong-theme");
    const shouldUseDark = savedTheme
      ? savedTheme === "dark"
      : window.matchMedia("(prefers-color-scheme: dark)").matches;

    setIsDarkMode(shouldUseDark);
    updateTheme(shouldUseDark);

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem("pong-theme")) {
        setIsDarkMode(e.matches);
        updateTheme(e.matches);
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const handleToggleTheme = () => {
    setIsDarkMode((prev) => {
      const newTheme = !prev;
      updateTheme(newTheme);
      localStorage.setItem("pong-theme", newTheme ? "dark" : "light");
      return newTheme;
    });
  };

  const { user } = useAuth();

  return (
    <Root>
      <Header userName={user?.username} />
      <Routes>
        <Route path="/" element={<FrontPage />} />
        <Route element={<RequireAuth />}>
          <Route path="/main" element={<MainMenu />} />

          <Route path="/game/lobby" element={<GameLobbyPage />} />
          <Route path="/game/queue" element={<GameQueuePage />} />
          <Route
            path="/game/match/:matchId"
            element={<GamePage userName={user?.username} />}
          />

          <Route path="/tournament/lobby" element={<TournamentLobbyPage />} />
          <Route path="/tournament/queue" element={<TournamentQueuePage />} />
          <Route
            path="/tournament/"
            element={<TournamentMatchPage userName={user?.username} />}
          />

          <Route path="/me" element={<ProfilePage />} />
        </Route>

        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/oauth/google/callback"
          element={<GoogleCallbackHandler />}
        />

        <Route path="/terms-of-service" element={<TermsOfServicePage />} />
        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />

        {/* Catch-all redirect from invalid/non-existent URLs */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Footer isDarkMode={isDarkMode} onToggleTheme={handleToggleTheme} />
    </Root>
  );
}
