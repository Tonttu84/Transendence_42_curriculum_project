import type { LucideProps } from "lucide-react";
import { HorizontalCard } from "./HorizontalCard";
import styled from "styled-components";

const GridContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-xxxlarge);
  margin: 4rem;

  /* desktop: 3 columns */
  @media (max-width: 768px) {
    grid-template-columns: repeat(1, 1fr);
  }
`;

interface MenuItem {
  id: string;
  title: string;
  description: string;
  icon: React.ForwardRefExoticComponent<
    Omit<LucideProps, "ref"> & React.RefAttributes<SVGSVGElement>
  >;
}

interface HorizontalCardGridProps {
  menuItems: MenuItem[];
  onClick?: (id: string) => void;
}

export const HorizontalCardGrid = ({
  menuItems,
  onClick,
}: HorizontalCardGridProps) => (
  <GridContainer>
    {menuItems.map((item) => (
      <HorizontalCard
        key={item.id}
        title={item.title}
        description={item.description}
        icon={item.icon}
        onClick={() => onClick && onClick(item.id)}
      />
    ))}
  </GridContainer>
);
