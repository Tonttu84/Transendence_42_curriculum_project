import { ContentContainer } from "../styles";
import { MarkdownRenderer } from "../MarkdownRenderer";
import { useLanguage } from "../../../LanguageProvider";
import { useEffect, useState } from "react";

export const PrivacyPolicyPage = () => {
  const { locale } = useLanguage();
  const [content, setContent] = useState<string>("");

  useEffect(() => {
    let isMounted = true;

    // Dynamically import markdown file based on locale (language)
    import(`../../../content/${locale}/privacy-policy.md?raw`)
      .then((module) => {
        if (isMounted) setContent(module.default);
      })
      .catch(() => {
        // Fall back to English if locale fails
        import(`../../../content/en/privacy-policy.md?raw`).then((module) => {
          if (isMounted) setContent(module.default);
        });
      });

    return () => {
      isMounted = false;
    };
  }, [locale]);

  return (
    <ContentContainer>
      <MarkdownRenderer content={content} />
    </ContentContainer>
  );
};
