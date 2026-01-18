import styled from "styled-components";

export const ContentContainer = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: var(--space-xxlarge) var(--space-large);
`;

export const Title = styled.h1`
  font-size: 2.2rem;
  font-weight: var(--bold);
  margin-block-end: var(--space-medium);
`;

export const HeadingLevelTwo = styled.h2`
  font-size: 1.6rem;
  font-weight: var(--semibold);
  margin-block-start: var(--space-large);
`;

export const HeadingLevelThree = styled.h3`
  font-size: 1.2rem;
  font-weight: var(--semibold);
  margin-block-start: var(--space-medium);
`;

export const Paragraph = styled.p`
  margin: 1rem 0;
`;

export const List = styled.ul`
  padding-inline-start: var(--space-xlarge);
`;

export const ListItem = styled.li`
  margin: 0.5rem 0;
  list-style-type: circle;
`;

export const Link = styled.a`
  text-decoration: underline;
`;
