import moment from "moment";
import styled from "styled-components";
import type { MatchHistoryRow, Message, SimpleUser } from "./ProfilePage";
import { FormattedMessage, useIntl } from "react-intl";
import { Pencil } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { isValidImageUrl } from "./utils";
import { TwoFactorAuthSettings } from "./TwoFactorAuthSettings";

const Root = styled.div`
  display: flex;
  flex-direction: column;
  max-width: 600px;
  width: 100%;
  margin: 0 auto;
  padding: 24px;
  gap: 32px;
  box-sizing: border-box;
`;

const Header = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  gap: 24px;
`;

const AvatarContainer = styled.div<{ size: number }>`
  position: relative;
  width: ${(props) => props.size}px;
  height: ${(props) => props.size}px;
`;

const AvatarBaseLayer = styled.div`
  border-radius: 9999px;
  background-color: var(--color-background);
  width: 100%;
  height: 100%;
`;

const Avatar = styled.img`
  width: 100%;
  height: 100%;
  border-radius: 9999px;
  object-fit: cover;
  border: 1px solid var(--border-subdued);
`;

const ChangeAvatarButton = styled.button`
  position: absolute;
  top: 0;
  left: 0;
  width: 32px;
  height: 32px;
  border-radius: 9999px;
  background: var(--color-background);
  color: var(--color-text);
  display: flex;
  justify-content: center;
  align-items: center;
  border: 1px solid var(--color-text);
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--outline-focused);
  }
`;

const StyledPencil = styled(Pencil)`
  width: 16px;
  height: 16px;
`;

const StyledError = styled(motion.span)`
  color: var(--error);
  display: block;
  margin-block-end: var(--space-small);
`;

const TitleContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: flex-start;
`;

const Title = styled.h1`
  font-size: 1.5rem;
  font-weight: 600;
`;

const StyledForm = styled.form`
  width: 100%;
`;

const AbsoluteInputFieldContainer = styled(motion.div)`
  display: flex;
  flex-direction: column;
  width: 100%;
  position: absolute;
  bottom: 100%;
  left: 0%;
  z-index: 2;
  margin-block-end: var(--space-small);

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    animation: none;
  }
`;

const NormalInputFieldContainer = styled.div`
  display: flex;
  width: 100%;
  align-items: center;
  gap: var(--space-small);
`;

const InputField = styled.input`
  box-sizing: border-box;
  background-color: transparent;
  width: 100%;
  height: 48px;
  border: solid 1.5px var(--border-subdued);
  border-radius: var(--radius-large);
  padding: var(--space-medium);

  &:focus-visible {
    outline: 2px solid var(--outline-focused);
    border-radius: var(--radius-small);
  }
`;

const Subtitle = styled.span`
  color: var(--color-text-subdued);
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  text-align: left;
`;

const TableHeader = styled.th`
  background: var(--background-color);
  border: 1px solid var(--border-subdued);
  padding: 8px;
  text-align: -webkit-center;
`;

const TableDataCentered = styled.td`
  border: 1px solid var(--border-subdued);
  padding: 8px;
  text-align: -webkit-center;
`;

const TableData = styled.td`
  border: 1px solid var(--border-subdued);
  padding: 8px;
`;

const StyledWon = styled.span`
  color: var(--success);
  font-weight: 700;
`;

const StyledLost = styled.span`
  color: var(--warning);
  font-weight: 700;
`;

const Section = styled.div``;

const MotionSection = styled(motion.div)``;

const SectionTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 500;
  margin-bottom: 8px;
`;

const StyledButton = styled.button`
  width: 100%;
  border-radius: var(--radius-large);
  border-width: 1.5px;
  padding: 0.75rem;
  border-color: var(--border);
  transition: transform 0.15s;
  &:hover {
    transform: scale(1.05);
  }
  &:active {
    transform: scale(0.95);
  }
`;

const FormFieldContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  position: relative;
  align-items: flex-start;
  gap: var(--space-small);
  width: 100%;
  margin-bottom: var(--space-small);
`;

const SuggestionPopup = styled.div`
  position: absolute;
  top: 110%;
  left: 0;
  right: 0;
  background-color: var(--color-background);
  overflow-y: auto;
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: var(--space-small);
  padding: var(--space-small);
`;

const SuggestionItem = styled.div`
  display: flex;
  height: 24px;
  width: 100%;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-small);
  padding: var(--space-small);
  cursor: pointer;

  &:hover {
    background: var(--color-background-subtle);
  }
`;

const FriendsCell = styled.td`
  border-left: 1px solid var(--border-subdued);
  border-bottom: 1px solid var(--border-subdued);
  padding: 8px;
  display: flex;
  align-items: center;
  gap: var(--space-small);
`;

const MessageContainer = styled.div<{ type: "ok" | "error" }>`
  padding: var(--space-small);
  border-radius: var(--radius-medium);
  color: ${(props) =>
    props.type === "ok" ? "var(--success)" : "var(--error)"};
  background-color: ${(props) =>
    props.type === "ok"
      ? "var(--success-background)"
      : "var(--error-background)"};
`;

const StyledSubmitButton = styled.input`
  font-size: 1.1rem;
  border: solid 1.5px var(--border);
  border-radius: var(--radius-large);
  padding: 0.75rem 1.5rem;
  transition: transform 0.15s;
  cursor: pointer;

  &:hover {
    transform: scale(1.05);
  }
  &:active {
    transform: scale(0.95);
  }
`;

const FullWidthStyledSubmitButton = styled(StyledSubmitButton)`
  width: 100%;
  font-size: 1.1rem;
  border: solid 1.5px var(--border);
  border-radius: var(--radius-large);
  padding: 0.75rem 1.5rem;
  transition: transform 0.15s;
  cursor: pointer;

  &:hover {
    transform: scale(1.05);
  }
  &:active {
    transform: scale(0.95);
  }
`;

const StyledSimpleUsername = styled.span`
  flex-grow: 1;
`;

const OnlineStatusCol = styled.col`
  width: 85px;
`;

const OnlineStatus = styled.span<{ $online: boolean }>`
  background-color: ${(props) =>
    props.$online ? "var(--success)" : "var(--error)"};
  ring-color: var(--color-background);
  border-radius: 50%;
  width: 10px;
  height: 10px;
  display: inline-block;
`;

interface ConfirmTwoFaProps {
  error: string | null;
  isLoading?: boolean;
  onChangeCode: () => void;
}

interface DisableTwoFaProps {
  password: string;
  error: string | null;
  isLoading?: boolean;
  onPasswordChange: (value: string) => void;
  onConfirm: () => void;
}

interface Props {
  userName: string;
  avatar: string;
  friends: SimpleUser[];
  allUsers: SimpleUser[];
  onAddFriend: (userName: string) => Promise<void>;
  matches: MatchHistoryRow;
  onEnableTwoFactorAuth: () => void;
  onDone: (code: string) => void;
  twoFactorAuthSecret: string | null;
  isSettingUpTwoFactorAuth: boolean;
  onChangeAvatar: (avatarUrl: string) => void;
  isOauthUser: boolean;
  isTwoFaEnabled: boolean;
  onDisableTwoFactorAuthClick: () => void;
  isDisablingTwoFa: boolean;
  disableTwoFaProps: DisableTwoFaProps;
  confirmTwoFaProps: ConfirmTwoFaProps;
  onChangePassword: (
    oldPassword: string,
    newPassword: string,
    confirmNewPassword: string,
  ) => Promise<void>;
  message: Message | null;
}

export const Profile = ({
  userName,
  avatar,
  friends,
  allUsers,
  onAddFriend,
  matches,
  onChangeAvatar,
  onEnableTwoFactorAuth,
  onDone,
  isSettingUpTwoFactorAuth,
  twoFactorAuthSecret,
  isOauthUser,
  isTwoFaEnabled,
  onDisableTwoFactorAuthClick,
  isDisablingTwoFa,
  disableTwoFaProps,
  confirmTwoFaProps,
  onChangePassword,
  message,
}: Props) => {
  const [avatarUrlInputFieldOpen, setAvatarUrlInputFieldOpen] = useState(false);
  const avatarUrlInputFieldRef = useRef<HTMLDivElement>(null);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [usernameInput, setUsernameInput] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [userSuggestions, setUserSuggestions] = useState<SimpleUser[]>([]);

  const { formatMessage } = useIntl();

  const userWins = matches.filter((match) => match.winner === userName).length;
  const userLosses = matches.filter((match) => match.loser === userName).length;

  const addFriendHandler = async (username?: string) => {
    const value = username ? username.trim() : usernameInput.trim();
    if (value === "") return;
    await onAddFriend(value);
    setUsernameInput("");
  };

  // Close dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        avatarUrlInputFieldRef.current &&
        !avatarUrlInputFieldRef.current.contains(event.target as Node)
      ) {
        setAvatarUrlInputFieldOpen(false);
        setError(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (usernameInput.trim() === "") {
      setUserSuggestions([]);
      return;
    }

    const suggestions = allUsers.filter(
      (user) =>
        user.username.toLowerCase().includes(usernameInput.toLowerCase()) &&
        !friends.some((friend) => friend.id === user.id) &&
        user.username !== userName,
    );

    setUserSuggestions(suggestions);
  }, [usernameInput, allUsers, friends, userName]);

  return (
    <Root ref={avatarUrlInputFieldRef}>
      <Header>
        <AvatarContainer size={112}>
          <ChangeAvatarButton
            title={formatMessage({ id: "profile.avatar.change-avatar" })}
            onClick={() => {
              setAvatarUrlInputFieldOpen((prev) => !prev);
            }}
            aria-haspopup="true"
            aria-expanded={avatarUrlInputFieldOpen}
          >
            <StyledPencil />
          </ChangeAvatarButton>
          {/* fallback in case invalid picture URL is provided */}
          <AvatarBaseLayer>
            <Avatar src={avatar} alt="Profile picture" />
          </AvatarBaseLayer>
        </AvatarContainer>
        <TitleContainer>
          <Title>{userName}</Title>
        </TitleContainer>
        <AnimatePresence>
          {avatarUrlInputFieldOpen && (
            <AbsoluteInputFieldContainer
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              {error && (
                <StyledError
                  role="alert"
                  aria-live="assertive"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 0 }}
                  transition={{ duration: 0.1, ease: "easeOut" }}
                >
                  {error}
                </StyledError>
              )}
              <StyledForm
                onSubmit={(e) => {
                  e.preventDefault();
                  const trimmedUrl = avatarUrl.trim();
                  if (!trimmedUrl) return;

                  if (!isValidImageUrl(trimmedUrl)) {
                    setError(
                      formatMessage({ id: "profile.avatar.invalid-url" }),
                    );
                    return;
                  }
                  onChangeAvatar(trimmedUrl);
                  setAvatarUrl("");
                  setAvatarUrlInputFieldOpen(false);
                  setError(null);
                }}
              >
                <InputField
                  type="text"
                  placeholder={formatMessage({
                    id: "profile.avatar.input-url",
                  })}
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setAvatarUrlInputFieldOpen(false);
                    }
                  }}
                  autoFocus
                />
              </StyledForm>
            </AbsoluteInputFieldContainer>
          )}
        </AnimatePresence>
      </Header>

      {/* Friends Section */}
      <Section>
        <SectionTitle>
          <FormattedMessage id="profile.friends.title" />
        </SectionTitle>
        {/* Add Friend Form */}
        <StyledForm
          onSubmit={(e) => {
            e.preventDefault();
            addFriendHandler();
          }}
        >
          <FormFieldContainer>
            <NormalInputFieldContainer>
              <InputField
                type="text"
                name="username"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder={formatMessage({
                  id: "profile.friends.add-friend-placeholder",
                })}
                autoComplete="off"
              />
              <StyledSubmitButton
                type="submit"
                value={formatMessage({ id: "profile.friends.add-button" })}
              />
            </NormalInputFieldContainer>
            {userSuggestions.length > 0 && (
              <SuggestionPopup>
                {userSuggestions.map((user) => (
                  <SuggestionItem
                    key={user.id}
                    onClick={async () => {
                      setUsernameInput(user.username);
                      await addFriendHandler(user.username);
                    }}
                  >
                    <SuggestionItem>
                      <AvatarContainer size={24}>
                        <AvatarBaseLayer>
                          <Avatar src={user.avatar} alt={user.username} />
                        </AvatarBaseLayer>
                      </AvatarContainer>
                      <StyledSimpleUsername>
                        {user.username}
                      </StyledSimpleUsername>
                      <OnlineStatus
                        $online={user.online}
                        title={
                          user.online
                            ? formatMessage({
                                id: "profile.friends.online",
                              })
                            : formatMessage({
                                id: "profile.friends.offline",
                              })
                        }
                      />
                    </SuggestionItem>
                  </SuggestionItem>
                ))}
              </SuggestionPopup>
            )}
          </FormFieldContainer>
          {message && message.field === "friend" && (
            <MessageContainer type={message.type}>
              {message.message}
            </MessageContainer>
          )}
        </StyledForm>

        <Table>
          {friends.length > 0 ? (
            <>
              <colgroup>
                <col />
                <OnlineStatusCol />
              </colgroup>
              <thead>
                <tr>
                  <TableHeader>
                    <FormattedMessage id="profile.friends.users-col" />
                  </TableHeader>
                  <TableHeader>
                    <FormattedMessage id="profile.friends.status-col" />
                  </TableHeader>
                </tr>
              </thead>
              <tbody>
                {friends.map((friend) => (
                  <tr key={friend.id}>
                    <FriendsCell>
                      <AvatarContainer size={24}>
                        <AvatarBaseLayer>
                          <Avatar src={friend.avatar} alt={friend.username} />
                        </AvatarBaseLayer>
                      </AvatarContainer>
                      <StyledSimpleUsername>
                        {friend.username}
                      </StyledSimpleUsername>
                    </FriendsCell>
                    <TableDataCentered>
                      <OnlineStatus
                        $online={friend.online}
                        title={
                          friend.online
                            ? formatMessage({
                                id: "profile.friends.online",
                              })
                            : formatMessage({
                                id: "profile.friends.offline",
                              })
                        }
                      />
                    </TableDataCentered>
                  </tr>
                ))}
              </tbody>
            </>
          ) : (
            <tbody>
              <tr>
                <td>
                  <Subtitle>
                    <FormattedMessage id="profile.friends.fallback" />
                  </Subtitle>
                </td>
              </tr>
            </tbody>
          )}
        </Table>
      </Section>

      {userWins > 0 && userLosses > 0 && (
        <Section>
          <SectionTitle>
            <FormattedMessage id="profile.game-stats.title" />
          </SectionTitle>
          <Table>
            <thead>
              <tr>
                <TableHeader>
                  <FormattedMessage id="profile.game-stats.wins" />
                </TableHeader>
                <TableHeader>
                  <FormattedMessage id="profile.game-stats.losses" />
                </TableHeader>
              </tr>
            </thead>
            <tbody>
              <tr>
                <TableDataCentered>{userWins}</TableDataCentered>
                <TableDataCentered>{userLosses}</TableDataCentered>
              </tr>
            </tbody>
          </Table>
        </Section>
      )}

      <Section>
        <SectionTitle>
          <FormattedMessage id="profile.match-history.title" />
        </SectionTitle>
        <Table>
          {matches.length > 0 && (
            <thead>
              <tr>
                <TableHeader>
                  <FormattedMessage id="profile.match-history.opponent" />
                </TableHeader>
                <TableHeader>
                  <FormattedMessage id="profile.match-history.result.title" />
                </TableHeader>
                <TableHeader>
                  <FormattedMessage id="profile.match-history.time" />
                </TableHeader>
              </tr>
            </thead>
          )}
          <tbody>
            {matches.length > 0 ? (
              matches.map((match, index) => (
                <tr key={index}>
                  <TableDataCentered>
                    {match.winner !== userName ? match.winner : match.loser}
                  </TableDataCentered>
                  <TableDataCentered>
                    {match.winner === userName ? (
                      <StyledWon>
                        <FormattedMessage id="profile.match-history.result.won" />
                      </StyledWon>
                    ) : (
                      <StyledLost>
                        <FormattedMessage id="profile.match-history.result.lost" />
                      </StyledLost>
                    )}
                  </TableDataCentered>
                  <TableDataCentered>
                    {moment(match.playedAt).format("LLL")}
                  </TableDataCentered>
                </tr>
              ))
            ) : (
              <tr>
                <td>
                  <Subtitle>
                    <FormattedMessage id="profile.match-history.fallback" />
                  </Subtitle>
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </Section>

      {!isOauthUser && (
        <>
          <Section>
            <SectionTitle>
              <FormattedMessage id="profile.settings.title" />
            </SectionTitle>
            <Table>
              <tbody>
                <tr>
                  <TableData>
                    <FormattedMessage id="profile.settings.2fa.title" />
                  </TableData>
                  <TableData>
                    {isTwoFaEnabled ? (
                      <>
                        <StyledButton onClick={onDisableTwoFactorAuthClick}>
                          <FormattedMessage id="profile.settings.2fa.disable-2fa" />
                        </StyledButton>
                      </>
                    ) : (
                      <StyledButton
                        onClick={onEnableTwoFactorAuth}
                        disabled={isSettingUpTwoFactorAuth}
                      >
                        <FormattedMessage id="profile.settings.2fa.enable-2fa" />
                      </StyledButton>
                    )}
                  </TableData>
                </tr>
              </tbody>
            </Table>
          </Section>
          <AnimatePresence>
            {(isSettingUpTwoFactorAuth && twoFactorAuthSecret) ||
            isDisablingTwoFa ? (
              <MotionSection
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                <TwoFactorAuthSettings
                  userName={userName}
                  isTwoFaEnabled={isTwoFaEnabled}
                  isDisablingTwoFa={isDisablingTwoFa}
                  password={disableTwoFaProps.password}
                  twoFactorAuthSecret={twoFactorAuthSecret}
                  isLoading={
                    disableTwoFaProps.isLoading || confirmTwoFaProps.isLoading
                  }
                  error={disableTwoFaProps.error ?? confirmTwoFaProps.error}
                  onChangeCode={confirmTwoFaProps.onChangeCode}
                  onDone={onDone}
                  onPasswordChange={disableTwoFaProps.onPasswordChange}
                  onConfirmDisable={disableTwoFaProps.onConfirm}
                />
              </MotionSection>
            ) : null}
          </AnimatePresence>
        </>
      )}

      {/* Change Password Section */}
      <Section>
        <SectionTitle>
          <FormattedMessage id="profile.change-password.title" />
        </SectionTitle>
        <StyledForm
          onSubmit={async (e) => {
            e.preventDefault();
            await onChangePassword(
              oldPassword,
              newPassword,
              confirmNewPassword,
            );
            setOldPassword("");
            setNewPassword("");
            setConfirmNewPassword("");
          }}
        >
          <FormFieldContainer>
            <InputField
              type="password"
              name="currentPassword"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder={formatMessage({
                id: "profile.change-password.current-password",
              })}
              required
            />
          </FormFieldContainer>
          <FormFieldContainer>
            <InputField
              type="password"
              name="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={formatMessage({
                id: "profile.change-password.new-password",
              })}
              required
            />
          </FormFieldContainer>
          <FormFieldContainer>
            <InputField
              type="password"
              name="confirmNewPassword"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              placeholder={formatMessage({
                id: "profile.change-password.confirm-new-password",
              })}
              required
            />
          </FormFieldContainer>
          <FullWidthStyledSubmitButton
            type="submit"
            value={formatMessage({
              id: "profile.change-password.update-button",
            })}
          />
          {message && message.field === "changePassword" && (
            <MessageContainer type={message.type}>
              {message.message}
            </MessageContainer>
          )}
        </StyledForm>
      </Section>
    </Root>
  );
};
