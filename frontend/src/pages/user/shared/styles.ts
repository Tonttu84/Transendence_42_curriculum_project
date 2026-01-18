import { Eye, EyeClosed } from "lucide-react";
import styled from "styled-components";

export const AuthRoot = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  max-height: 100%;
  padding: 1rem;
`;

export const ContentContainer = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
`;

export const AuthCard = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 500px;
  background-color: var(--background-elevated);
  border: solid 1px var(--border);
  border-top-style: none;
  border-radius: 0 0 var(--radius-xlarge) var(--radius-xlarge);
  gap: var(--space-large);
  padding: var(--space-large);
`;

export const TabContainer = styled.div`
  display: flex;
  width: 100%;
  max-width: 500px;
  box-sizing: border-box;

  background-color: var(--background-elevated);
  border: solid 1px var(--border);
  border-bottom-style: none;
  border-radius: var(--radius-xlarge) var(--radius-xlarge) 0 0;

  @media (max-width: 480px) {
    font-size: 0.95rem;
  }
`;

export const Title = styled.h2`
  font-size: 2rem;
  font-weight: bold;
  padding: 0.75rem;
  word-wrap: break-word;
  overflow-wrap: break-word;

  @media (max-width: 480px) {
    font-size: 1.5rem;
    padding: 0.5rem;
  }
`;

export const InputFieldContainer = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  position: relative;
  gap: var(--space-small);
`;

export const InputField = styled.input`
  width: 100%;
  height: 48px;
  background-color: transparent;
  padding: var(--space-medium);
  border: solid 1.5px var(--border);
  border-radius: var(--radius-large);

  @media (max-width: 480px) {
    height: 44px;
    font-size: 1rem;
  }
`;

export const InputLabel = styled.label`
  font-size: 1rem;
  margin: 0;
`;

export const ErrorWrapper = styled.span`
  color: var(--error);
`;

export const ErrorMessageWrapper = styled.div`
  width: 100%;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  color: var(--error);
  font-weight: 600;
`;

export const SuccessMessageWrapper = styled.div`
  width: 100%;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  color: var(--success);
  font-weight: 600;
`;

export const GoogleLoginButton = styled.button`
  width: 100%;
  font-size: 1.1rem;
  padding: 0.75rem 1.5rem;
  border: solid 1.5px var(--border);
  border-radius: var(--radius-large);
  transition: transform 0.15s;
  cursor: pointer;

  @media (max-width: 480px) {
    font-size: 1rem;
    padding: 0.65rem 1rem;
  }
  &:active {
    transform: scale(0.95);
  }
`;

export const StyledEye = styled(Eye)`
  width: 24px;
  height: 24px;
  position: absolute;
  top: 45px;
  right: 15px;
`;

export const StyledEyeClosed = styled(EyeClosed)`
  width: 24px;
  height: 24px;
  position: absolute;
  top: 45px;
  right: 15px;
`;

export const ButtonContentContainer = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  gap: var(--space-large);
`;

export const StyledSubmitButton = styled.input`
  font-size: 1.1rem;
  border: solid 1.5px var(--border);
  border-radius: var(--radius-large);
  padding: 0.75rem 1.5rem;
  transition: transform 0.15s;
  cursor: pointer;

  &:active {
    transform: scale(0.95);
  }
`;
