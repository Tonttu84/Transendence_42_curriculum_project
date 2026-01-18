import type { LucideProps } from "lucide-react";
import styled from "styled-components";

const Root = styled.button`
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: var(--space-small);
`;

const TitleDescriptionContainer = styled.div``;

const Title = styled.h3`
  font-size: 1.25rem;
  font-weight: 600;
  line-height: 1.75rem;
  margin-bottom: 0.25rem;
`;

const Description = styled.span`
  font-size: 1.125rem;
  line-height: 1.75rem;
`;

type Props = {
  icon: React.ForwardRefExoticComponent<
    Omit<LucideProps, "ref"> & React.RefAttributes<SVGSVGElement>
  >;
  title: string;
  description: string;
  onClick: () => void;
};

export const HorizontalCard = ({
  icon: Icon,
  title,
  description,
  onClick,
}: Props) => {
  return (
    <Root onClick={onClick}>
      <Icon />
      <TitleDescriptionContainer>
        <Title>{title}</Title>
        <Description>{description}</Description>
      </TitleDescriptionContainer>
    </Root>
  );
};
