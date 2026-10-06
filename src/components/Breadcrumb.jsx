import { ChevronRight, Home } from 'lucide-react';
import { useLocation, Link } from 'react-router-dom';
import { getBreadcrumbs, ROUTES } from '../constants/routes';

const Breadcrumb = () => {
  const location = useLocation();
  const breadcrumbs = getBreadcrumbs(location.pathname);

  if (location.pathname === '/login' || location.pathname === '/logout') return null;
  if (breadcrumbs.length === 0) return null;

  // build a label→path map from all routes (last crumb of each route = its name)
  const crumbPathMap = {};
  ROUTES.forEach((r) => {
    if (!r.path.includes(':')) crumbPathMap[r.name] = r.path;
  });

  return (
    <nav>
      <ol className="flex items-center gap-1">
        <li>
          <Link to="/" className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors" title="Go to Dashboard">
            <Home size={20} />
          </Link>
        </li>
        {breadcrumbs.map((crumb, index) => {
          const isLast = index === breadcrumbs.length - 1;
          const path = crumbPathMap[crumb];
          return (
            <li key={index} className="flex items-center gap-1">
              <ChevronRight size={16} className="text-(--color-text-muted)" />
              {!isLast && path ? (
                <Link to={path} className="text-lg text-(--color-text-muted) transition-colors hover:text-(--color-accent)">
                  {crumb}
                </Link>
              ) : (
                <span className={`text-lg ${isLast ? 'font-semibold text-(--color-text)' : 'text-(--color-text-muted)'}`}>
                  {crumb}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumb;
