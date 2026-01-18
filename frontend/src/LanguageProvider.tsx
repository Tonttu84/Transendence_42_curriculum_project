import React, { useContext, useEffect, useState } from "react";
import { IntlProvider } from "react-intl";
import de from "./config/locales/de.json";
import en from "./config/locales/en.json";
import fi from "./config/locales/fi.json";
import ru from "./config/locales/ru.json";
import cn from "./config/locales/cn.json";

type Messages = {
  [key: string]: string | Messages;
};

const messages: Record<string, Messages> = {
  de,
  en,
  fi,
  ru,
  cn,
};

interface LanguageContextType {
  locale: string;
  setLocale: (locale: string) => void;
}

function flattenMessages(
  nestedMessages: Messages,
  prefix = "",
): Record<string, string> {
  return Object.keys(nestedMessages).reduce<Record<string, string>>(
    (acc, key) => {
      const value = nestedMessages[key];
      const prefixedKey = prefix ? `${prefix}.${key}` : key;

      if (typeof value === "object") {
        Object.assign(acc, flattenMessages(value as Messages, prefixedKey));
      } else {
        acc[prefixedKey] = value;
      }

      return acc;
    },
    {},
  );
}

export const LanguageContext = React.createContext<LanguageContextType>({
  locale: "en",
  setLocale: () => {},
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [locale, setLocaleState] = useState("en");

  // Load saved locale from localStorage
  useEffect(() => {
    const savedLocale = localStorage.getItem("locale");
    if (savedLocale && messages[savedLocale]) {
      setLocaleState(savedLocale);
    }
  }, []);

  // Update locale and persist to localStorage
  const setLocale = (newLocale: string) => {
    if (messages[newLocale]) {
      setLocaleState(newLocale);
      localStorage.setItem("locale", newLocale);
    }
  };

  return (
    <LanguageContext.Provider value={{ locale, setLocale }}>
      <IntlProvider
        locale={locale}
        messages={flattenMessages(messages[locale])}
      >
        {children}
      </IntlProvider>
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
