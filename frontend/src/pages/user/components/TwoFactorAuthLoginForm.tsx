import { useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import styled from "styled-components";
import { ErrorMessageWrapper, InputField, InputLabel } from "../shared/styles";
import { authApi } from "../../../api/authApi";

const InputFieldContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
`;

const VerifyButton = styled.button`
  margin-top: 12px;
  width: 100%;
  font-size: 1.1rem;
  border: solid 1.5px var(--border);
  border-radius: var(--radius-large);
  padding: 0.75rem 1.5rem;
  cursor: pointer;
  transition: transform 0.15s;

  &:active {
    transform: scale(0.95);
  }
`;

interface TwoFactorAuthResult {
  token: string;
  user: {
    username: string;
    avatar?: string;
  };
}

interface Props {
  sessionToken: string;
  onSuccess: (result: TwoFactorAuthResult) => void;
}

export const TwoFactorAuthLoginForm = ({ sessionToken, onSuccess }: Props) => {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { formatMessage } = useIntl();

  const submit = async () => {
    setError(null);

    const controller = new AbortController();

    try {
      const res = await authApi.post<TwoFactorAuthResult>(
        "/2fa",
        { sessionToken, twoFaCode: code },
        { signal: controller.signal },
      );

      onSuccess(res.data);
    } catch (err: any) {
      if (err.name === "CanceledError") return;
      if (err.response?.status === 400 || err.response?.status === 401) {
        setError(formatMessage({ id: "account.login.2fa.invalid-code" }));
      } else {
        setError(formatMessage({ id: "error-generic" }));
      }
    }
  };

  return (
    <InputFieldContainer>
      <InputLabel htmlFor="twoFactorCode">
        <FormattedMessage id="account.login.2fa.title" />
      </InputLabel>
      <InputField
        id="twoFactorCode"
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        autoCapitalize="none"
        autoCorrect="off"
        value={code}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          setCode(e.target.value)
        }
        maxLength={6}
        placeholder={formatMessage({ id: "account.login.2fa.enter-code" })}
        onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
      />
      {error && (
        <ErrorMessageWrapper role="alert" aria-live="assertive">
          {error}
        </ErrorMessageWrapper>
      )}
      <VerifyButton type="button" onClick={submit}>
        <FormattedMessage id="account.login.2fa.verify" />
      </VerifyButton>
    </InputFieldContainer>
  );
};
