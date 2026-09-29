import { twMerge } from 'tailwind-merge';

const Button = ({
  children,
  variant = 'primary',
  className = '',
  type = 'button',
  ...props
}) => (
  <button
    type={type}
    className={twMerge(`button button-${variant}`, className)}
    {...props}
  >
    {children}
  </button>
);

export default Button;
