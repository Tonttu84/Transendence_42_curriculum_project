import { useState, useRef, useEffect } from "react";
import styled from "styled-components";
import { useAuth } from "../AuthProvider";
import { useNavigate } from "react-router";
import isNonNullable from "is-non-nullable";
import { AnimatePresence, motion } from "motion/react";
import { useLanguage } from "../LanguageProvider";
import { FormattedMessage, useIntl } from "react-intl";
import { House } from "lucide-react";

const Root = styled.div`
  display: flex;
  align-items: center;
  margin-block-start: var(--space-large);
  margin-inline-start: var(--space-large);
  margin-inline-end: var(--space-large);
  position: relative;
`;

const MainMenuButton = styled.button`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: var(--space-small);
`;

const RightContent = styled.div`
  margin-left: auto;
  display: flex;
  align-items: center;
`;

const HelloButton = styled.button`
  font-size: 1.25rem;
  cursor: pointer;
  user-select: none;
  background: none;
  border: none;
  padding: 0;
  &:focus-visible {
    outline: 2px solid var(--outline-focused);
    outline-offset: 0.5rem;
    border-radius: var(--radius-small);
  }
`;

const StyledOption = styled.option`
  background-color: var(--color-background);
  color: var(--color-text);
`;

const Dropdown = styled(motion.div)`
  position: absolute;
  top: 100%;
  right: 0;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-small);
  margin-top: var(--space-small);
  padding: var(--space-small) 0;
  min-width: 160px;
  z-index: 2;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    animation: none;
  }
`;

const DropdownList = styled.ul`
  list-style: none;
`;

const DropdownItem = styled.li`
  width: 100%;
  position: relative;
`;

const StyledButton = styled.button`
  padding: var(--space-small) var(--space-medium);
  width: 100%;
  text-align: start;
  cursor: pointer;
  font-size: 1rem;
  &:focus-visible {
    outline: 2px solid var(--outline-focused);
    border-radius: var(--radius-small);
  }
`;

const LanguageLabel = styled.label`
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  padding: var(--space-small) var(--space-medium);
  position: relative;
  user-select: none;
`;

const LanguageWrapper = styled.div`
  display: flex;
  flex-direction: column;
`;

const LanguageTitle = styled.div`
  font-size: 1rem;
`;

const CurrentLanguage = styled.div`
  font-size: 0.75rem;
  color: var(--text-subdued);
`;

const LanguageSelector = styled.select`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
`;

type Props = {
  userName?: string;
};

export const Header = ({ userName }: Props) => {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const { formatMessage } = useIntl();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { locale, setLocale } = useLanguage();

  // Close dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!isAuthenticated) {
    return (
      <Root>
        <RightContent>
          <StyledButton onClick={() => navigate("/login")}>
            <FormattedMessage id="header.sign-in" />
          </StyledButton>
        </RightContent>
      </Root>
    );
  }

  const languageMap = (locale: string) => {
    switch (locale) {
      case "de":
        return formatMessage({ id: "header.language.german" });
      case "en":
        return formatMessage({ id: "header.language.english" });
      case "fi":
        return formatMessage({ id: "header.language.finnish" });
      case "ru":
        return formatMessage({ id: "header.language.russian" });
      case "cn":
        return formatMessage({ id: "header.language.chinese" });
    }
  };

  return (
    <Root ref={dropdownRef}>
      {isNonNullable(userName) && (
        <>
          <MainMenuButton onClick={() => navigate("/main")}>
            <House />
            <FormattedMessage id="header.main-menu" />
          </MainMenuButton>
          <RightContent>
            <HelloButton
              onClick={() => setDropdownOpen((prev) => !prev)}
              aria-haspopup="true"
              aria-expanded={dropdownOpen}
            >
              <FormattedMessage id="header.hello" />
              {userName}!
            </HelloButton>
          </RightContent>
        </>
      )}
      <AnimatePresence>
        {dropdownOpen && (
          <Dropdown
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <DropdownList role="menu">
              <DropdownItem role="menuitem">
                <StyledButton
                  onClick={() => {
                    navigate("/me");
                    setDropdownOpen(false);
                  }}
                >
                  <FormattedMessage id="header.profile" />
                </StyledButton>
              </DropdownItem>

              <DropdownItem role="menuitem">
                <LanguageLabel htmlFor="language-selector">
                  <LanguageWrapper>
                    <LanguageTitle>
                      <FormattedMessage id="header.language-select" />
                    </LanguageTitle>
                    <CurrentLanguage>{languageMap(locale)}</CurrentLanguage>
                  </LanguageWrapper>
                  <LanguageSelector
                    id="language-selector"
                    value={locale}
                    onChange={(e) => {
                      setLocale(e.target.value);
                      setDropdownOpen(false);
                    }}
                  >
                    <StyledOption value="en">
                      <FormattedMessage id="header.language.english" />
                    </StyledOption>
                    <StyledOption value="fi">
                      <FormattedMessage id="header.language.finnish" />
                    </StyledOption>
                    <StyledOption value="ru">
                      <FormattedMessage id="header.language.russian" />
                    </StyledOption>
                    <StyledOption value="de">
                      <FormattedMessage id="header.language.german" />
                    </StyledOption>
                    <StyledOption value="cn">
                      <FormattedMessage id="header.language.chinese" />
                    </StyledOption>
                  </LanguageSelector>
                </LanguageLabel>
              </DropdownItem>

              <DropdownItem role="menuitem">
                <StyledButton
                  onClick={() => {
                    navigate("/");
                    logout();
                    setDropdownOpen(false);
                  }}
                >
                  <FormattedMessage id="header.sign-out" />
                </StyledButton>
              </DropdownItem>
            </DropdownList>
          </Dropdown>
        )}
      </AnimatePresence>
    </Root>
  );
};
