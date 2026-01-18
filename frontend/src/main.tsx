import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { LanguageProvider } from "./LanguageProvider.tsx";
import { AuthProvider } from "./AuthProvider.tsx";
import { BrowserRouter } from "react-router-dom";
import { ErrorBoundary } from "./ErrorBoundary.tsx";
import { AuthInterceptor } from "./interceptors/AuthInterceptor.tsx";
import { GameInterceptor } from "./interceptors/GameInterceptor.tsx";
import { TournamentInterceptor } from "./interceptors/TournamentInterceptor.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <LanguageProvider>
            <AuthInterceptor />
            <GameInterceptor />
            <TournamentInterceptor />
            <App />
          </LanguageProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);
