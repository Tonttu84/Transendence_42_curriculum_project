import { useEffect } from "react";
import { authApi } from "../api/authApi";
import { useNavigate } from "react-router";

function setupAuthInterceptor({
  onGeneralError,
}: {
  onGeneralError: () => void;
}) {
  authApi.interceptors.response.use(
    (res) => res,
    (err) => {
      if (err.response?.status === 404 || err.response?.status === 500) {
        onGeneralError();
      }
      return Promise.reject(err);
    },
  );
}

export function AuthInterceptor() {
  const navigate = useNavigate();

  useEffect(() => {
    setupAuthInterceptor({
      onGeneralError: () => {
        navigate("/");
      },
    });
  }, [navigate]);

  return null;
}
