import { createContext, useContext } from 'react';

export const DarkModeContext = createContext<boolean>(false);
export const useDarkMode = () => useContext(DarkModeContext);
