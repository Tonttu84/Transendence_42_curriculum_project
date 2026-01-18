// MarkdownRenderer.tsx
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import * as style from "./styles";

interface Props {
  content: string;
}

export const MarkdownRenderer: React.FC<Props> = ({ content }) => {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => <style.Title>{children}</style.Title>,
        h2: ({ children }) => (
          <style.HeadingLevelTwo>{children}</style.HeadingLevelTwo>
        ),
        h3: ({ children }) => (
          <style.HeadingLevelThree>{children}</style.HeadingLevelThree>
        ),
        p: ({ children }) => <style.Paragraph>{children}</style.Paragraph>,
        ul: ({ children }) => <style.List>{children}</style.List>,
        li: ({ children }) => <style.ListItem>{children}</style.ListItem>,
        a: ({ href, children }) => (
          <style.Link href={href} target="_blank" rel="noopener noreferrer">
            {children}
          </style.Link>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
};
