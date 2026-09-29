import { twMerge } from 'tailwind-merge';

const GlassCard = ({ children, className = '', as: Component = 'section', ...props }) => (
  <Component className={twMerge('glass-card', className)} {...props}>
    {children}
  </Component>
);

export default GlassCard;
