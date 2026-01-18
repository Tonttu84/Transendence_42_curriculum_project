import styled from "styled-components";
import { Globe, Moon, Sun } from "lucide-react";
import { FormattedMessage, useIntl } from "react-intl";
import { useLanguage } from "../LanguageProvider";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useNavigate } from "react-router";

type Props = {
  isDarkMode: boolean;
  onToggleTheme: () => void;
};

const Root = styled.footer`
  display: flex;
  flex-direction: row;
  gap: var(--space-large);
  margin-block-end: var(--space-small);
  margin-inline-start: var(--space-small);
  justify-content: flex-start;
  font-size: 1rem;

  @media screen and (max-width: 480px) {
    gap: var(--space-medium);
  }
`;

const MenuItem = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: var(--space-small);
  margin-block-end: var(--space-small);
`;

const ThemeMenuItem = styled(MenuItem)`
  padding-left: var(--space-medium);
`;

const Dropdown = styled(motion.div)`
  position: absolute;
  bottom: 100%;
  left: 0%;
  right: 0;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-small);
  margin-block-end: var(--space-small);
  padding: var(--space-small) 0;
  min-width: 160px;
  z-index: 2;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    animation: none;
  }
`;

const LanguageContainer = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--space-small);
  cursor: pointer;
`;

const LanguageButton = styled.button`
  display: flex;
  align-items: center;
  gap: var(--space-small);
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;

  &:focus-visible {
    outline: 2px solid var(--outline-focused);
    outline-offset: 0.25rem;
    border-radius: var(--radius-small);
  }
`;

const DropdownList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
`;

const DropdownItem = styled.li`
  width: 100%;
`;

const DropdownButton = styled.button`
  width: 100%;
  padding: var(--space-small) var(--space-medium);
  text-align: left;
  background: none;
  border: none;
  cursor: pointer;

  &:hover {
    background: var(--color-background-subtle);
  }
`;

const StyledButton = styled.button`
  display: flex;
  align-items: center;
  gap: var(--space-small);

  &:focus-visible {
    outline: 2px solid var(--outline-focused);
    outline-offset: 0.25rem;
    border-radius: var(--radius-small);
  }
`;

const StyledGlobe = styled(Globe)`
  width: 24px;
  height: 24px;
`;

const StyledMoon = styled(Moon)`
  width: 24px;
  height: 24px;
`;

const StyledSun = styled(Sun)`
  width: 24px;
  height: 24px;
`;

export const Footer = ({ isDarkMode, onToggleTheme }: Props) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { formatMessage } = useIntl();
  const navigate = useNavigate();
  const { setLocale } = useLanguage();

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

  return (
    <Root>
      <ThemeMenuItem>
        <StyledButton
          onClick={onToggleTheme}
          aria-label={
            isDarkMode
              ? formatMessage({ id: "footer.theme.switch-to-light" })
              : formatMessage({ id: "footer.theme.switch-to-dark" })
          }
        >
          {isDarkMode ? <StyledSun /> : <StyledMoon />}
          <FormattedMessage id="footer.theme.title" />
        </StyledButton>
      </ThemeMenuItem>
      <MenuItem ref={dropdownRef}>
        <LanguageContainer>
          <LanguageButton
            onClick={() => setDropdownOpen((prev) => !prev)}
            aria-haspopup="true"
            aria-expanded={dropdownOpen}
          >
            <StyledGlobe />
            <FormattedMessage id="footer.language.title" />
          </LanguageButton>

          <AnimatePresence>
            {dropdownOpen && (
              <Dropdown
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                <DropdownList role="menu">
                  <DropdownItem role="menuitem">
                    <DropdownButton
                      onClick={() => {
                        setLocale("en");
                        setDropdownOpen(false);
                      }}
                    >
                      <FormattedMessage id="header.language.english" />
                    </DropdownButton>
                  </DropdownItem>

                  <DropdownItem role="menuitem">
                    <DropdownButton
                      onClick={() => {
                        setLocale("fi");
                        setDropdownOpen(false);
                      }}
                    >
                      <FormattedMessage id="header.language.finnish" />
                    </DropdownButton>
                  </DropdownItem>

                  <DropdownItem role="menuitem">
                    <DropdownButton
                      onClick={() => {
                        setLocale("ru");
                        setDropdownOpen(false);
                      }}
                    >
                      <FormattedMessage id="header.language.russian" />
                    </DropdownButton>
                  </DropdownItem>

                  <DropdownItem role="menuitem">
                    <DropdownButton
                      onClick={() => {
                        setLocale("de");
                        setDropdownOpen(false);
                      }}
                    >
                      <FormattedMessage id="header.language.german" />
                    </DropdownButton>
                  </DropdownItem>

                  <DropdownItem role="menuitem">
                    <DropdownButton
                      onClick={() => {
                        setLocale("cn");
                        setDropdownOpen(false);
                      }}
                    >
                      <FormattedMessage id="header.language.chinese" />
                    </DropdownButton>
                  </DropdownItem>
                </DropdownList>
              </Dropdown>
            )}
          </AnimatePresence>
        </LanguageContainer>
      </MenuItem>
      <MenuItem>
        <StyledButton onClick={() => navigate("/terms-of-service")}>
          <FormattedMessage id="footer.terms-of-service" />
        </StyledButton>
      </MenuItem>
      <MenuItem>
        <StyledButton onClick={() => navigate("/privacy-policy")}>
          <FormattedMessage id="footer.privacy-policy" />
        </StyledButton>
      </MenuItem>
    </Root>
  );
};
