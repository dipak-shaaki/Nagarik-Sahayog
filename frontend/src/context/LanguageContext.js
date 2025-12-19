import React, { createContext, useState, useContext, useEffect } from 'react';
import { I18n } from 'i18n-js';
import * as Localization from 'expo-localization';
import { en, ne } from '../constants/translations';

const LanguageContext = createContext();

const i18n = new I18n({ en, ne });
i18n.enableFallback = true;

export const LanguageProvider = ({ children }) => {
    const [locale, setLocale] = useState(Localization.getLocales()[0].languageCode === 'ne' ? 'ne' : 'en');

    useEffect(() => {
        i18n.locale = locale;
    }, [locale]);

    const changeLanguage = (lang) => {
        setLocale(lang);
    };

    const t = (key) => i18n.t(key, { locale });

    return (
        <LanguageContext.Provider value={{ locale, changeLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => useContext(LanguageContext);
