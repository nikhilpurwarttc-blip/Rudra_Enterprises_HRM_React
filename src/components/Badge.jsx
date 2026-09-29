const COLORS = {
  primary: 'border border-(--color-accent) bg-(--color-accent-soft) text-(--color-accent)',
  blue: 'border border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300',
  green: 'border border-green-500/20 bg-green-500/10 text-green-700 dark:text-green-300',
  red: 'border border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300',
  yellow: 'border border-yellow-500/20 bg-yellow-500/10 text-yellow-700 dark:text-yellow-300',
  amber: 'border border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  purple: 'border border-purple-500/20 bg-purple-500/10 text-purple-700 dark:text-purple-300',
  gray: 'border border-(--color-border) bg-(--color-surface) text-(--color-text-muted)',
  teal: 'border border-teal-500/20 bg-teal-500/10 text-teal-700 dark:text-teal-300',
  aqua: 'border border-cyan-500/20 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300',
  brown: 'border border-orange-500/20 bg-orange-500/10 text-orange-700 dark:text-orange-300',
  gold: 'border border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300',
};

const Badge = ({ title, children, text, color = 'blue', className }) => (
  <span
    title={title}
    className={`inline-flex items-center w-auto whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium capitalize ${COLORS[color] ?? COLORS.primary} ${className || ''}`}
  >
    {children}
    {text}
  </span>
);

export default Badge;