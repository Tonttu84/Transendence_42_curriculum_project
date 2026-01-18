import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../../AuthProvider";
import { authApi } from "../../../api/authApi";

export const GoogleCallbackHandler = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    const controller = new AbortController();

    const fetchUser = async (token: string) => {
      try {
        localStorage.setItem("token", token);
        const res = await authApi.get("/me", { signal: controller.signal });

        login({ token, user: res.data });
        navigate("/main", { replace: true });
      } catch (err: any) {
        if (err.name === "CanceledError") return;
        navigate("/login");
      }
    };

    const token = params.get("token");
    const error = params.get("error");

    if (error || !token) {
      navigate("/login");
      return;
    }

    fetchUser(token);

    return () => controller.abort();
  }, []);

  return null;
};
