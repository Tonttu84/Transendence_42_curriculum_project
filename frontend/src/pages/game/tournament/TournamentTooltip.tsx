import { CircleQuestionMark } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { FormattedMessage } from "react-intl";
import styled from "styled-components";

const QuestionMarkWrapper = styled.div`
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  top: var(--space-medium);
  right: var(--space-medium);
  cursor: pointer;
`;

const StyledQuestionMark = styled(CircleQuestionMark)`
  width: 24px;
  height: 24px;
  color: var(--color-text-subdued);
`;

const Tooltip = styled(motion.div)<{ isVisible: boolean }>`
  position: absolute;
  bottom: 100%;
  right: 0;
  background-color: var(--color-background);
  color: var(--color-text);
  padding: var(--space-small) var(--space-medium);
  width: 350px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-medium);
  font-size: 0.9rem;
  white-space: nowrap;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  opacity: ${({ isVisible }) => (isVisible ? 1 : 0)};
  transition: opacity 0.2s ease-in-out;
  pointer-events: ${({ isVisible }) => (isVisible ? "auto" : "none")};
  z-index: 10;
  white-space: normal;
  word-wrap: break-word;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    animation: none;
  }
`;

const InfoSection = styled.div`
  margin-block: var(--space-small);
  background-color: var(--color-background-secondary);
  border-radius: var(--border-radius);
  text-align: start;
`;

const InfoTitle = styled.h3`
  font-size: 1.1rem;
  font-weight: 600;
  margin-block-end: var(--space-small);
`;

const InfoList = styled.ul`
  list-style-type: decimal;
  padding: 0;
  margin-inline-start: var(--space-medium);
`;

export const TournamentTooltip = () => {
  const [tooltipVisible, setTooltipVisible] = useState(false);

  const steps = [
    "tournament.tooltip.step-one",
    "tournament.tooltip.step-two",
    "tournament.tooltip.step-three",
  ];

  return (
    <QuestionMarkWrapper
      onMouseEnter={() => setTooltipVisible(true)}
      onMouseLeave={() => setTooltipVisible(false)}
    >
      <StyledQuestionMark />
      <AnimatePresence>
        {tooltipVisible && (
          <Tooltip
            isVisible={tooltipVisible}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <InfoSection>
              <InfoTitle>
                <FormattedMessage id="tournament.tooltip.title" />
              </InfoTitle>
              <InfoList>
                {steps.map((id) => (
                  <li key={id}>
                    <FormattedMessage id={id} />
                  </li>
                ))}
              </InfoList>
            </InfoSection>
          </Tooltip>
        )}
      </AnimatePresence>
    </QuestionMarkWrapper>
  );
};
