import { Play, Trophy } from "lucide-react";
import { HorizontalCardGrid } from "../../shared/HorizontalCardGrid";
import styled from "styled-components";
import { useNavigate } from "react-router";
import { useIntl } from "react-intl";

const Root = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  gap: 2rem;
`;

export const MainMenu = () => {
  const navigate = useNavigate();
  const { formatMessage } = useIntl();

  const menuItems = [
    {
      id: "game/lobby",
      title: formatMessage({ id: "main-menu.sections.game.title" }),
      description: formatMessage({ id: "main-menu.sections.game.description" }),
      icon: Play,
      primary: true,
    },
    {
      id: "tournament/lobby",
      title: formatMessage({ id: "main-menu.sections.tournament.title" }),
      description: formatMessage({
        id: "main-menu.sections.tournament.description",
      }),
      icon: Trophy,
    },
  ];

  const onCardClick = async (id: string) => {
    return navigate(`/${id}`);
  };

  return (
    <Root>
      <HorizontalCardGrid onClick={onCardClick} menuItems={menuItems} />
    </Root>
  );
};
