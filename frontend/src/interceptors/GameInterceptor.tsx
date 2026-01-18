import { useEffect } from "react";
import { gameApi } from "../api/gameApi";
import { useNavigate } from "react-router-dom";

function setupGameInterceptor({
  onUnauthorized,
  onGeneralError,
}: {
  onUnauthorized: () => void;
  onGeneralError: () => void;
}) {
  gameApi.interceptors.response.use(
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

export function GameInterceptor() {
  const navigate = useNavigate();

  useEffect(() => {
    setupGameInterceptor({
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
