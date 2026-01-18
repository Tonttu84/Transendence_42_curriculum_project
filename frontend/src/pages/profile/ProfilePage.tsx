import { useEffect, useState } from "react";
import { Profile } from "./Profile";
import styled from "styled-components";
import { authApi } from "../../api/authApi";
import { gameApi } from "../../api/gameApi";
import isNonNullable from "is-non-nullable";
import { useIntl } from "react-intl";
import { useAuth } from "../../AuthProvider";
import { useNavigate } from "react-router";

const Root = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  flex: 1;
`;

type ProfileData = {
  avatar: string;
  username: string;
  email: string;
  twoFa: boolean;
  googleOauthId: string | null | undefined;
};

export type MatchHistoryRow = {
  winner: string;
  loser: string;
  playedAt: string;
}[];

export type SimpleUser = {
  id: number;
  username: string;
  avatar?: string;
  online: boolean;
};

export type Message = {
  type: "ok" | "error";
  field: "friend" | "changePassword";
  message: string;
};

export const ProfilePage = () => {
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [matches, setMatches] = useState<MatchHistoryRow>([]);
  const [friends, setFriends] = useState<SimpleUser[]>([]);
  const [allUsers, setAllUsers] = useState<SimpleUser[]>([]);
  const [message, setMessage] = useState<Message | null>(null);
  const { formatMessage } = useIntl();
  const { logout } = useAuth();
  const navigate = useNavigate();

  const fetchProfileData = async (): Promise<boolean> => {
    try {
      const { data } = await authApi.get<ProfileData>("/me");
      setProfileData(data);
      return true;
    } catch (error: any) {
      return false;
    }
  };

  const fetchAllOtherData = async () => {
    try {
      const results = await Promise.allSettled([
        authApi.get<SimpleUser[]>("/"),
        authApi.get<SimpleUser[]>("/friends"),
        gameApi.get<{ matches: MatchHistoryRow }>("/matchhistory"),
      ]);

      if (results[0].status === "fulfilled") setAllUsers(results[0].value.data);
      if (results[1].status === "fulfilled") setFriends(results[1].value.data);
      if (results[2].status === "fulfilled")
        setMatches(results[2].value.data.matches);
    } catch (error: any) {
      // Handle errors if necessary
    }
  };

  useEffect(() => {
    fetchProfileData().then((success) => {
      if (success) {
        fetchAllOtherData();
      }
    });
  }, []);

  useEffect(() => {
    if (!message) return;

    const timer = setTimeout(() => {
      setMessage(null);
    }, 3000);

    return () => clearTimeout(timer);
  }, [message]);

  const [isSettingUpTwoFactorAuth, setIsSettingUpTwoFactorAuth] =
    useState(false);
  const [twoFactorAuthSecret, setTwoFactorAuthSecret] = useState<string | null>(
    null,
  );
  const [twoFactorSetupToken, setTwoFactorSetupToken] = useState<string | null>(
    null,
  );
  const [isDisablingTwoFa, setIsDisablingTwoFa] = useState(false);
  const [disableTwoFaPassword, setDisableTwoFaPassword] = useState("");
  const [disableTwoFaError, setDisableTwoFaError] = useState<string | null>(
    null,
  );
  const [isDisablingTwoFaLoading, setIsDisablingTwoFaLoading] = useState(false);

  const [enableTwoFaError, setEnableTwoFaError] = useState<string | null>(null);
  const [isConfirmingTwoFa, setIsConfirmingTwoFa] = useState(false);

  // Step 1: Start setup, fetch temporary secret from backend, show QR code
  const handleStartTwoFactorAuth = async () => {
    try {
      const { data } = await authApi.post("/2fa/setup");

      setTwoFactorAuthSecret(data.twoFaSecret);
      setTwoFactorSetupToken(data.setupToken);
      setIsSettingUpTwoFactorAuth(true);
      setEnableTwoFaError(null);
    } catch (err) {
      // Handle error if necessary
    }
  };

  // Step 2: Confirm setup and finalize 2FA after user scans QR & enters code
  const handleConfirmTwoFactorAuth = async (code: string) => {
    if (!twoFactorSetupToken) {
      setEnableTwoFaError("Session expired, please try again.");
      return;
    }

    try {
      setIsConfirmingTwoFa(true);
      setEnableTwoFaError(null);

      const { data } = await authApi.post("/2fa/confirm", {
        twoFaCode: code,
        setupToken: twoFactorSetupToken,
      });

      if (data.token) {
        localStorage.setItem("token", data.token);
      }

      setIsSettingUpTwoFactorAuth(false);
      setTwoFactorAuthSecret(null);
      setTwoFactorSetupToken(null);
      setProfileData((prev) => (prev ? { ...prev, twoFa: true } : null));
    } catch (err: any) {
      setEnableTwoFaError(
        err?.response?.data?.error ?? "Invalid authentication code",
      );
    } finally {
      setIsConfirmingTwoFa(false);
    }
  };

  const handleChangeAvatar = async (newAvatarUrl: string) => {
    if (!newAvatarUrl) return;

    try {
      await authApi.put("/me", {
        username: profileData?.username,
        email: profileData?.email,
        avatar: newAvatarUrl,
      });

      setProfileData((prev) =>
        prev ? { ...prev, avatar: newAvatarUrl } : prev,
      );
    } catch (error: any) {
      // Handle error if necessary
    }
  };

  const handleDisableTwoFactorAuth = async () => {
    try {
      setIsDisablingTwoFaLoading(true);
      setDisableTwoFaError(null);

      const { data } = await authApi.put("/2fa/disable", {
        password: disableTwoFaPassword,
      });

      // Update auth token if returned
      if (data.token) {
        localStorage.setItem("token", data.token);
      }

      setProfileData((prev) => (prev ? { ...prev, twoFa: false } : prev));

      setDisableTwoFaPassword("");
      setIsDisablingTwoFa(false);
    } catch (err: any) {
      setDisableTwoFaError(
        err?.response?.data?.error ?? "Failed to disable 2FA",
      );
    } finally {
      setIsDisablingTwoFaLoading(false);
    }
  };

  const handleAddFriend = async (friendName: string) => {
    let message: Message = {
      type: "ok",
      field: "friend",
      message: formatMessage({ id: "profile.friends.successfully-added" }),
    };
    try {
      const userId = allUsers.find((user) => user.username === friendName)?.id;
      if (!userId) throw new Error("User not found.");

      await authApi.post<SimpleUser[]>("/friends", { userId });
      const { data } = await authApi.get<SimpleUser[]>("/friends");
      setFriends(data);
    } catch (error: any) {
      message = {
        type: "error",
        field: "friend",
        message: formatMessage({ id: "profile.friends.failed-to-add" }),
      };
      // Optionally log the error or handle it further
    } finally {
      setMessage(message);
    }
  };

  const handleChangePassword = async (
    oldPassword: string,
    newPassword: string,
    confirmNewPassword: string,
  ) => {
    if (
      oldPassword.trim() === "" ||
      newPassword.trim() === "" ||
      confirmNewPassword.trim() === "" ||
      oldPassword === newPassword ||
      newPassword !== confirmNewPassword
    ) {
      setMessage({
        type: "error",
        field: "changePassword",
        message: formatMessage({ id: "profile.change-password.invalid-input" }),
      });
      return;
    }

    let message: Message = {
      type: "ok",
      field: "changePassword",
      message: formatMessage({ id: "profile.change-password.success" }),
    };
    try {
      await authApi.put("/password", {
        oldPassword,
        newPassword,
      });

      logout();

      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (error: any) {
      message = {
        type: "error",
        field: "changePassword",
        message: formatMessage({ id: "profile.change-password.error" }),
      };
    } finally {
      setMessage(message);
    }
  };

  return (
    isNonNullable(profileData) && (
      <Root>
        <Profile
          userName={profileData.username}
          avatar={profileData.avatar}
          isOauthUser={profileData.googleOauthId ? true : false}
          isTwoFaEnabled={profileData.twoFa}
          friends={friends}
          allUsers={allUsers}
          onAddFriend={handleAddFriend}
          matches={matches}
          onChangeAvatar={handleChangeAvatar}
          onDone={handleConfirmTwoFactorAuth}
          onEnableTwoFactorAuth={handleStartTwoFactorAuth}
          isSettingUpTwoFactorAuth={isSettingUpTwoFactorAuth}
          twoFactorAuthSecret={twoFactorAuthSecret}
          onDisableTwoFactorAuthClick={() => setIsDisablingTwoFa(true)}
          isDisablingTwoFa={isDisablingTwoFa}
          disableTwoFaProps={{
            password: disableTwoFaPassword,
            error: disableTwoFaError,
            isLoading: isDisablingTwoFaLoading,
            onPasswordChange: setDisableTwoFaPassword,
            onConfirm: handleDisableTwoFactorAuth,
          }}
          confirmTwoFaProps={{
            error: enableTwoFaError,
            isLoading: isConfirmingTwoFa,
            onChangeCode: () => setEnableTwoFaError(null),
          }}
          onChangePassword={handleChangePassword}
          message={message}
        />
      </Root>
    )
  );
};
