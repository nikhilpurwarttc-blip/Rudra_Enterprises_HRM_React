import { createContext, useContext, useState, useMemo } from 'react';

const RightPanelContext = createContext(null);

export const RightPanelProvider = ({ children }) => {
  const [activePanel, setActivePanel] = useState(null); // single active panel key
  const value = useMemo(() => ({ activePanel, setActivePanel }), [activePanel]);

  return (
    <RightPanelContext.Provider value={value}>
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
