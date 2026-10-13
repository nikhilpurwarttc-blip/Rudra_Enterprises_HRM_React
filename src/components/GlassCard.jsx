import { cn } from '../utils/cn';

const GlassCard = ({ children, className = '', as: Component = 'section', ...props }) => (
  <Component className={cn('glass-card', className)} {...props}>
    {children}
  </Component>
);

export default GlassCard;
