import { motion } from "motion/react";
import styled from "styled-components";
import { useNavigate } from "react-router";
import { FormattedMessage } from "react-intl";
import { useAuth } from "../../AuthProvider";

const Root = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  gap: 2rem;
`;

const ContentContainer = styled.div`
  text-align: center;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  flex: 1;
  gap: 2rem;
  padding-left: 1rem;
  padding-right: 1rem;
`;

const TitleContainer = styled(motion.div)`
  display: flex;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    animation: none;
  }
`;

const Title = styled.h1`
  font-size: 6rem;
  font-weight: bold;

  @media (max-width: 768px) {
    font-size: 3.5rem;
  }
`;

const StyledButton = styled(motion.button)`
  font-size: 1.25rem;
  border-radius: var(--radius-large);
  border-width: 1.5px;
  padding: 0.75rem 1.5rem;
  border-color: var(--border);
  transition: transform 0.15s;
  &:hover {
    transform: scale(1.05);
  }
  &:active {
    transform: scale(0.95);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    animation: none;
  }
`;

export const FrontPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const onClickBeginButton = () => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    navigate("/main");
  };

  return (
    <Root>
      <ContentContainer>
        <TitleContainer
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Title>
            <FormattedMessage id="front-page.title" />
          </Title>
        </TitleContainer>
        <StyledButton
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          onClick={onClickBeginButton}
        >
          <FormattedMessage id="front-page.begin" />
        </StyledButton>
      </ContentContainer>
    </Root>
  );
};
