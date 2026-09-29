/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useMemo } from 'react';
import { ROUTES } from '../constants/routes';
import usePermission from '../hooks/usePermission';

const SearchContext = createContext(null);

export const SearchProvider = ({ children }) => {
  const [searchQuery,  setSearchQuery]  = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  // const { can, isSuperAdmin } = usePermission();
  const { can } = usePermission();

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return ROUTES
      .filter((r) => {
        if (!r.permission) return false;
        // if (!isSuperAdmin) {
          const permKey = r.permissionKey ?? r.path;
          const permAction = r.permissionAction ?? 'view';
          if (!can(permKey, permAction)) return false;
        // }
        return r.name.toLowerCase().includes(q) || r.keywords?.some((k) => k.includes(q));
      })
      .slice(0, 8);
  }, [searchQuery, can]);
  // }, [searchQuery, can, isSuperAdmin]);
  return (
    <SearchContext.Provider value={{ searchQuery, setSearchQuery, isSearchOpen, setIsSearchOpen, searchResults }}>
      {children}
    </SearchContext.Provider>
  );
};

export const useSearch = () => {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error('useSearch must be used within SearchProvider');
  return ctx;
};

export default SearchContext;
