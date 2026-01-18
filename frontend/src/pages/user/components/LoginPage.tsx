import { FormattedMessage, useIntl } from "react-intl";
import styled from "styled-components";
import { useForm } from "react-hook-form";
import { Navigate, useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { GoogleLoginIcon } from "../../../shared/GoogleLoginIcon";
import { useAuth } from "../../../AuthProvider";
import type { LoginFormData, TwoFactorAuthProps } from "../shared/types";
import { handleGoogleLogin } from "../handlers/handleGoogleLogin";
import { TwoFactorAuthLoginForm } from "./TwoFactorAuthLoginForm";
import { AnimatePresence, motion } from "motion/react";
import { authApi } from "../../../api/authApi";
import {
  AuthCard,
  AuthRoot,
  ButtonContentContainer,
  ContentContainer,
  ErrorMessageWrapper,
  ErrorWrapper,
  GoogleLoginButton,
  InputField,
  InputFieldContainer,
  InputLabel,
  StyledEye,
  StyledEyeClosed,
  StyledSubmitButton,
  SuccessMessageWrapper,
  Title,
} from "../shared/styles";

const TabContainer = styled.div`
  display: flex;
  flex-direction: row;
  width: 500px;
  background-color: var(--background-elevated);
  border: solid 1px var(--border);
  border-bottom-style: none;
  border-radius: var(--radius-xlarge) var(--radius-xlarge) 0 0;
`;

const StyledRegisterTab = styled.button`
  width: 100%;
  font-size: 1.1rem;
  background-color: var(--background-subdued);
  border-radius: var(--radius-xlarge) 0 var(--radius-medium);
  padding: 0.75rem 1.5rem;
  cursor: pointer;
`;

const StyledLoginTab = styled.button`
  width: 100%;
  font-size: 1.1rem;
  border-left-style: none;
  padding: 0.75rem 1.5rem;
  cursor: pointer;
`;

const MotionSection = styled(motion.div)`
  width: 100%;
`;

export const LoginPage = () => {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<LoginFormData>();
  const [twoFactorAuth, setTwoFactorAuth] = useState<TwoFactorAuthProps | null>(
    null,
  );

  const { login, isAuthenticated } = useAuth();
  const { formatMessage } = useIntl();
  const navigate = useNavigate();

  const [isVisible, setIsVisible] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSuccess = (message: string) => {
    setSuccessMessage(message);

    setTimeout(() => {
      navigate("/main");
    }, 1300);
  };

  const onSubmit = async (data: LoginFormData) => {
    setErrorMessage(null);

    const controller = new AbortController();

    try {
      const res = await authApi.post("/loginByIdentifier", data, {
        signal: controller.signal,
      });

      const result = res.data;

      login({
        token: result.token,
        user: { username: result.username, avatar: result.avatar },
      });

      handleSuccess(formatMessage({ id: "account.login.login-success" }));
    } catch (err: any) {
      if (err.name === "CanceledError") return;

      const res = err.response;

      if (res?.status === 428 && res.data?.message === "2FA_REQUIRED") {
        setTwoFactorAuth({
          sessionToken: res.data.sessionToken,
          twoFaSecret: res.data.twoFaSecret,
        });
        return;
      }
      setErrorMessage(formatMessage({ id: "account.login.error" }));
    }

    return () => controller.abort();
  };

  const handleTwoFactorSuccess = (result: any) => {
    login({
      token: result.token,
      user: { username: result.username, avatar: result.avatar },
    });
    navigate("/main");
  };

  const toggleVisible = () => {
    setIsVisible(!isVisible);
  };

  const identifier = watch("identifier");
  const password = watch("password");

  useEffect(() => {
    if (twoFactorAuth) {
      setTwoFactorAuth(null);
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  }, [identifier, password]);

  return isAuthenticated ? (
    <Navigate to="/main" replace />
  ) : (
    <AuthRoot>
      <form onSubmit={handleSubmit(onSubmit)}>
        <ContentContainer>
          <TabContainer>
            <StyledRegisterTab
              type="button"
              onClick={() => navigate(`/register`)}
            >
              <FormattedMessage id="account.register.tab" />
            </StyledRegisterTab>
            <StyledLoginTab type="button" onClick={() => navigate(`/login`)}>
              <FormattedMessage id="account.login.tab" />
            </StyledLoginTab>
          </TabContainer>
          <AuthCard>
            {successMessage && (
              <SuccessMessageWrapper role="status" aria-live="polite">
                {successMessage}
              </SuccessMessageWrapper>
            )}
            {errorMessage && (
              <ErrorMessageWrapper role="alert" aria-live="assertive">
                {errorMessage}
              </ErrorMessageWrapper>
            )}
            <Title>
              <FormattedMessage id="account.login.title" />
            </Title>
            <GoogleLoginButton type="button" onClick={handleGoogleLogin}>
              <ButtonContentContainer>
                <GoogleLoginIcon />
                <FormattedMessage id="account.sign-in-with-google" />
              </ButtonContentContainer>
            </GoogleLoginButton>

            <InputFieldContainer>
              <InputLabel htmlFor="identifier">
                <FormattedMessage id="account.identifier" />
              </InputLabel>
              <InputField
                id="identifier"
                autoComplete="username"
                inputMode="email"
                autoCapitalize="none"
                autoCorrect="off"
                type="text"
                {...register("identifier", {
                  required: true,
                  minLength: 3,
                  maxLength: 254, //generic max length for emails
                  validate: (value) => {
                    const isEmail = value.includes("@");
                    const isUsername =
                      /^[a-zA-Z0-9_]+$/.test(value) && value.length <= 30;
                    return (
                      isEmail ||
                      isUsername ||
                      formatMessage({ id: "account.invalid-identifier" })
                    );
                  },
                })}
              />
              {errors.identifier && (
                <ErrorWrapper>
                  <FormattedMessage id="account.invalid-identifier" />
                </ErrorWrapper>
              )}
            </InputFieldContainer>

            <InputFieldContainer>
              <InputLabel htmlFor="password">
                <FormattedMessage id="account.password" />
              </InputLabel>
              <InputField
                id="password"
                autoComplete="current-password"
                autoCapitalize="none"
                autoCorrect="off"
                type={!isVisible ? "password" : "text"}
                {...register("password", {
                  required: true,
                  minLength: 3,
                  maxLength: 20,
                })}
              />
              {isVisible ? (
                <StyledEye
                  onClick={toggleVisible}
                  role="button"
                  aria-label={formatMessage({
                    id: "account.register.password.hide-password",
                  })}
                />
              ) : (
                <StyledEyeClosed
                  onClick={toggleVisible}
                  role="button"
                  aria-label={formatMessage({
                    id: "account.register.password.show-password",
                  })}
                />
              )}
              {errors.password && (
                <ErrorWrapper>
                  <FormattedMessage id="account.invalid-password" />
                </ErrorWrapper>
              )}
            </InputFieldContainer>

            <AnimatePresence>
              {twoFactorAuth?.sessionToken && (
                <MotionSection
                  initial={{ opacity: 1, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <TwoFactorAuthLoginForm
                    sessionToken={twoFactorAuth.sessionToken}
                    onSuccess={handleTwoFactorSuccess}
                  />
                </MotionSection>
              )}
            </AnimatePresence>

            {!twoFactorAuth && (
              <StyledSubmitButton
                type="submit"
                value={formatMessage({ id: "account.continue" })}
              />
            )}
          </AuthCard>
        </ContentContainer>
      </form>
    </AuthRoot>
  );
};
