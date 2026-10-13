import { cn } from '../utils/cn';

const Button = ({
  children,
  variant = 'primary',
  className = '',
  type = 'button',
  ...props
}) => (
  <button
    type={type}
    className={cn(`button button-${variant}`, className)}
    {...props}
  >
    {children}
  </button>
);

export default Button;
