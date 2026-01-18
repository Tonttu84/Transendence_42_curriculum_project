import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import styled from "styled-components";

const Root = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  justify-content: center;
`;

const ContentContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding-inline: var(--space-large);
  gap: var(--space-medium);
`;

const InformationContainer = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  gap: var(--space-large);
  flex-wrap: wrap;
`;

const QRCodeContainer = styled.div`
  display: flex;
  margin: 0;
  img {
    width: 150px;
    height: 150px;
    max-width: 80vw;
  }
`;

const DescriptionContainer = styled.div`
  flex: 1 1 200px;
  min-width: 200px;
  max-width: 300px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: var(--space-medium);
`;

const StyledSpan = styled.span`
  width: 100%;
  text-wrap: balance;
  text-align: start;
  overflow-wrap: break-word;
`;

const InputField = styled.input`
  background-color: transparent;
  width: 100%;
  height: 48px;
  border: solid 1.5px var(--border-subdued);
  border-radius: var(--radius-large);
  padding: var(--space-medium);
`;

const StyledError = styled.span`
  color: var(--error);
  display: block;
  margin-block-end: var(--space-small);
`;

export const StyledButton = styled.button`
  border-radius: var(--radius-large);
  border-width: 1.5px;
  padding: 0.75rem;
  border-color: var(--border);
  transition: transform 0.15s;
  &:hover {
    transform: scale(1.02);
  }
  &:active {
    transform: scale(0.95);
  }
  &:focus-visible {
    outline: 2px solid var(--outline-focused);
    border-radius: var(--radius-small);
  }
`;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-small);
`;

interface Props {
  userName: string;
  isTwoFaEnabled: boolean;
  isDisablingTwoFa: boolean;
  password?: string;
  twoFactorAuthSecret: string | null;
  isLoading?: boolean;
  error?: string | null;
  onChangeCode?: () => void;
  onDone: (code: string) => void;
  onPasswordChange: (value: string) => void;
  onConfirmDisable: () => void;
}

export const TwoFactorAuthSettings = ({
  userName,
  isTwoFaEnabled,
  isDisablingTwoFa,
  password,
  twoFactorAuthSecret,
  isLoading,
  error,
  onChangeCode,
  onDone,
  onPasswordChange,
  onConfirmDisable,
}: Props) => {
  const [qrCode, setQRCode] = useState<string>("");
  const [code, setCode] = useState("");

  const { formatMessage } = useIntl();

  // Generate QR code when setting up 2FA
  useEffect(() => {
    if (!twoFactorAuthSecret) return;

    const otpauthUrl =
      `otpauth://totp/${encodeURIComponent("Transcenders")}:${encodeURIComponent(userName)}` +
      `?secret=${twoFactorAuthSecret}&issuer=${encodeURIComponent("Transcenders")}`;

    QRCode.toDataURL(otpauthUrl).then(setQRCode);
  }, [twoFactorAuthSecret, userName]);

  // Disable 2FA flow
  if (isTwoFaEnabled && isDisablingTwoFa) {
    return (
      <Container>
        <InputField
          type="password"
          placeholder={formatMessage({
            id: "profile.settings.2fa.confirm-password",
          })}
          value={password}
          onChange={(e) => onPasswordChange?.(e.target.value)}
          disabled={isLoading}
        />
        <StyledButton
          onClick={onConfirmDisable}
          disabled={isLoading || !password}
        >
          <FormattedMessage id="profile.settings.2fa.confirm" />
        </StyledButton>
        {error && <StyledError>{error}</StyledError>}
      </Container>
    );
  }

  // Enable 2FA flow
  if (!isTwoFaEnabled && twoFactorAuthSecret) {
    const isValidCode = /^\d{6}$/.test(code);
    return (
      <Root>
        <ContentContainer>
          {qrCode && (
            <InformationContainer>
              <QRCodeContainer>
                <img
                  src={qrCode}
                  alt={formatMessage({ id: "profile.settings.2fa.qr-code" })}
                />
              </QRCodeContainer>
              <DescriptionContainer>
                <StyledSpan>
                  <FormattedMessage id="profile.settings.2fa.enable-2fa-setup" />
                </StyledSpan>
                <InputField
                  type="text"
                  inputMode="numeric"
                  value={code}
                  onChange={(e) => {
                    const digitsOnly = e.target.value.replace(/\D/g, "");
                    setCode(digitsOnly.slice(0, 6));
                    onChangeCode?.();
                  }}
                  placeholder={formatMessage({
                    id: "profile.settings.2fa.setup-code",
                  })}
                  maxLength={6}
                  disabled={isLoading}
                />
              </DescriptionContainer>
            </InformationContainer>
          )}
          <StyledButton
            onClick={() => onDone?.(code)}
            disabled={!isValidCode || isLoading}
          >
            <FormattedMessage id="profile.settings.2fa.confirm" />
          </StyledButton>
          {error && <StyledError role="alert">{error}</StyledError>}
        </ContentContainer>
      </Root>
    );
  }

  if (!isTwoFaEnabled) {
    return (
      <StyledButton onClick={() => onDone(code)} disabled={isLoading}>
        <FormattedMessage id="profile.settings.2fa.enable-2fa" />
      </StyledButton>
    );
  }

  return null;
};
