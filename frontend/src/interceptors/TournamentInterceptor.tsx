import { useEffect } from "react";
import { useNavigate } from "react-router";
import { tournamentApi } from "../api/tournamentApi";

function setupTournamentInterceptor({
  onUnauthorized,
  onGeneralError,
}: {
  onUnauthorized: () => void;
  onGeneralError: () => void;
}) {
  tournamentApi.interceptors.response.use(
    (res) => res,
    (err) => {
      if (err.response?.status === 401) {
        onUnauthorized();
      }
      if (err.response?.status === 404 || err.response?.status === 500) {
        onGeneralError();
      }
      return Promise.reject(err);
    },
  );
}

export function TournamentInterceptor() {
  const navigate = useNavigate();

  useEffect(() => {
    setupTournamentInterceptor({
      onUnauthorized: () => {
        navigate("/login");
      },
      onGeneralError: () => {
        navigate("/");
      },
    });
  }, [navigate]);

  return null;
}
