import { createContext, useContext } from 'react';

export const ColorModeContext = createContext({
  toggleColorMode: () => {},
  mode: 'light',
});

export const useColorMode = () => useContext(ColorModeContext);
