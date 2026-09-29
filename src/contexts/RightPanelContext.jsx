import { createContext, useContext, useState, useCallback } from 'react';

const RightPanelContext = createContext(null);

export const RightPanelProvider = ({ children }) => {
  const [panel, setPanel] = useState(null); // { title, content, onSubmit }
  const [activePanel, setActivePanel] = useState(null); // single active panel key

  const openPanel  = useCallback((config) => setPanel(config), []);
  const closePanel = useCallback(() => setPanel(null), []);

  return (
    <RightPanelContext.Provider value={{ panel, openPanel, closePanel, activePanel, setActivePanel }}>
      {children}
    </RightPanelContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useRightPanel = () => {
  const ctx = useContext(RightPanelContext);
  if (!ctx) throw new Error('useRightPanel must be used within RightPanelProvider');
  return ctx;
};
