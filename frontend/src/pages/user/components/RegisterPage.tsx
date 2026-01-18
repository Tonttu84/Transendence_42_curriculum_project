import React, { useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import styled from "styled-components";
import { useForm } from "react-hook-form";
import { Navigate, useNavigate } from "react-router";
import { GoogleLoginIcon } from "../../../shared/GoogleLoginIcon";
import { handleGoogleLogin } from "../handlers/handleGoogleLogin";
import { useAuth } from "../../../AuthProvider";
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
  TabContainer,
  Title,
} from "../shared/styles";

const StyledRegisterButton = styled.button`
  width: 100%;
  font-size: 1.1rem;
  padding: 0.75rem 1.5rem;
  transition: transform 0.15s;
  cursor: pointer;
`;

const StyledLoginButton = styled.button`
  width: 100%;
  font-size: 1.1rem;
  border-radius: var(--radius-large);
  border-radius: 0 var(--radius-xlarge) 0 var(--radius-medium);
  background-color: var(--background-subdued);
  border-left-style: none;
  padding: 0.75rem 1.5rem;
  transition: transform 0.15s;
  cursor: pointer;
`;

type RegistrationFormData = {
  email: string;
  username: string;
  password: string;
  repeatPassword: string;
  avatar: string;
};

export const RegisterPage: React.FC = () => {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegistrationFormData>({
    defaultValues: { avatar: "default" },
  });

  const { formatMessage } = useIntl();
  const navigate = useNavigate();

  const [isVisible, setIsVisible] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();

  const toggleVisible = () => {
    setIsVisible((s) => !s);
  };

  const handleSuccess = (message: string) => {
    setSuccessMessage(message);

    setTimeout(() => {
      navigate("/login");
    }, 1300);
  };

  const onSubmit = async (data: RegistrationFormData) => {
    setErrorMessage(null);

    const controller = new AbortController();

    try {
      await authApi.post(
        "/",
        {
          email: data.email,
          username: data.username,
          password: data.password,
          avatar:
            data.avatar && data.avatar !== "default"
              ? data.avatar
              : "https://static.vecteezy.com/system/resources/previews/055/838/788/non_2x/a-black-and-white-illustration-of-a-ping-pong-racket-vector.jpg",
        },
        { signal: controller.signal },
      );

      handleSuccess(
        formatMessage({ id: "account.register.create-account-success" }),
      );
    } catch (err: any) {
      if (err.name === "CanceledError") return;
      setErrorMessage(formatMessage({ id: "account.register.error" }));
    }

    return () => controller.abort();
  };

  const passwordValue = watch("password");

  return isAuthenticated ? (
    <Navigate to="/main" replace />
  ) : (
    <AuthRoot>
      <form onSubmit={handleSubmit(onSubmit)}>
        <ContentContainer>
          <TabContainer>
            <StyledRegisterButton
              type="button"
              onClick={() => navigate(`/register`)}
            >
              <FormattedMessage id="account.register.tab" />
            </StyledRegisterButton>
            <StyledLoginButton type="button" onClick={() => navigate(`/login`)}>
              <FormattedMessage id="account.login.tab" />
            </StyledLoginButton>
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
              <FormattedMessage id="account.register.create-account" />
            </Title>
            <GoogleLoginButton type="button" onClick={handleGoogleLogin}>
              <ButtonContentContainer>
                <GoogleLoginIcon />
                <FormattedMessage id="account.sign-in-with-google" />
              </ButtonContentContainer>
            </GoogleLoginButton>
            <InputFieldContainer>
              <InputLabel htmlFor="email">
                <FormattedMessage id="account.email" />
              </InputLabel>
              <InputField
                id="email"
                type="email"
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                {...register("email", {
                  maxLength: 254, //generic max length for emails
                  required: formatMessage({
                    id: "account.register.email.required",
                  }),
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/i,
                    message: formatMessage({
                      id: "account.register.email.invalid",
                    }),
                  },
                })}
              />
              {errors.email && (
                <ErrorWrapper>{errors.email.message}</ErrorWrapper>
              )}
            </InputFieldContainer>
            <InputFieldContainer>
              <InputLabel htmlFor="username">
                <FormattedMessage id="account.username" />
              </InputLabel>
              <InputField
                id="username"
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                {...register("username", {
                  required: formatMessage({
                    id: "account.register.username.required",
                  }),
                  minLength: {
                    value: 3,
                    message: formatMessage({
                      id: "account.register.username.too-short",
                    }),
                  },
                  maxLength: {
                    value: 20,
                    message: formatMessage({
                      id: "account.register.username.too-long",
                    }),
                  },
                  pattern: {
                    value: /^[a-z0-9]+$/i,
                    message: formatMessage({
                      id: "account.register.username.invalid",
                    }),
                  },
                })}
              />
              {errors.username && (
                <ErrorWrapper>{errors.username.message}</ErrorWrapper>
              )}
            </InputFieldContainer>
            <InputFieldContainer>
              <InputLabel htmlFor="password">
                <FormattedMessage id="account.password" />
              </InputLabel>
              <InputField
                id="password"
                type={!isVisible ? "password" : "text"}
                autoComplete="new-password"
                autoCapitalize="none"
                autoCorrect="off"
                {...register("password", {
                  required: formatMessage({
                    id: "account.register.password.required",
                  }),
                  minLength: {
                    value: 3,
                    message: formatMessage({
                      id: "account.register.password.too-short",
                    }),
                  },
                  maxLength: {
                    value: 20,
                    message: formatMessage({
                      id: "account.register.password.too-long",
                    }),
                  },
                })}
              />
              {isVisible ? (
                <StyledEye
                  onClick={toggleVisible}
                  role="button"
                  aria-label="Hide password"
                />
              ) : (
                <StyledEyeClosed
                  onClick={toggleVisible}
                  role="button"
                  aria-label="Show password"
                />
              )}
              {errors.password && (
                <ErrorWrapper>{errors.password.message}</ErrorWrapper>
              )}
            </InputFieldContainer>
            <InputFieldContainer>
              <InputLabel htmlFor="repeatPassword">
                <FormattedMessage id="account.register.confirm-password" />
              </InputLabel>
              <InputField
                id="repeatPassword"
                type={!isVisible ? "password" : "text"}
                autoComplete="new-password"
                autoCapitalize="none"
                autoCorrect="off"
                {...register("repeatPassword", {
                  required: formatMessage({
                    id: "account.register.password.repeat-required",
                  }),
                  validate: (value) =>
                    value === passwordValue ||
                    formatMessage({
                      id: "account.register.password.must-match",
                    }),
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
              {errors.repeatPassword && (
                <ErrorWrapper>{errors.repeatPassword.message}</ErrorWrapper>
              )}
            </InputFieldContainer>
            <input type="hidden" value="default" {...register("avatar")} />
            <StyledSubmitButton
              type="submit"
              disabled={isSubmitting}
              value={formatMessage({
                id: "account.continue",
              })}
            />
          </AuthCard>
        </ContentContainer>
      </form>
    </AuthRoot>
  );
};
