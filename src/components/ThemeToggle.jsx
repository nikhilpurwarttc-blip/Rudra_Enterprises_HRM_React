import { Moon, Sun, Star } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  const isDark = theme === 'dark';
  const nextTheme = isDark ? 'light' : 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${nextTheme} mode`}
      title={`Switch to ${nextTheme} mode`}
      className={`
        group relative
        flex h-9 w-16
        items-center
        overflow-hidden
        rounded-full
        border
        transition-all duration-700
        focus:outline-none
        ${
          isDark
            ? 'border-slate-700 bg-slate-950'
            : 'border-sky-200 bg-sky-100'
        }
      `}
    >
      {/* ------------------------------------------------
          Background
      ------------------------------------------------ */}

      <div
        className={`
          absolute inset-0
          transition-all duration-1000
          ${
            isDark
              ? 'bg-linear-to-r from-slate-950 via-slate-900 to-indigo-950'
              : 'bg-linear-to-r from-sky-100 via-sky-200 to-amber-100'
          }
        `}
      />

      {/* ------------------------------------------------
          Stars - Dark Mode
      ------------------------------------------------ */}

      <div
        className={`
          pointer-events-none absolute inset-0
          transition-all duration-700
          ${
            isDark
              ? 'opacity-100'
              : 'opacity-0'
          }
        `}
      >
        <Star
          size={7}
          fill="currentColor"
          className="
            absolute left-2 top-2
            text-white
            animate-pulse
          "
        />

        <Star
          size={5}
          fill="currentColor"
          className="
            absolute left-6 top-1
            text-white/70
            animate-pulse
          "
          style={{
            animationDelay: '300ms',
          }}
        />

        <Star
          size={6}
          fill="currentColor"
          className="
            absolute right-3 bottom-2
            text-white/70
            animate-pulse
          "
          style={{
            animationDelay: '600ms',
          }}
        />
      </div>

      {/* ------------------------------------------------
          Sun Rays
      ------------------------------------------------ */}

      <div
        className={`
          absolute left-1/2 top-1/2
          -translate-x-1/2
          -translate-y-1/2
          transition-all duration-700
          ${
            isDark
              ? 'scale-0 rotate-180 opacity-0'
              : 'scale-100 rotate-0 opacity-100'
          }
        `}
      >
        <div
          className="
            h-8 w-8
            rounded-full
            border border-amber-300/50
            animate-[spin_8s_linear_infinite]
          "
        />
      </div>

      {/* ------------------------------------------------
          Toggle Circle
      ------------------------------------------------ */}

      <div
        className={`
          relative z-10
          flex h-7 w-7
          items-center justify-center
          rounded-full
          shadow-lg
          transition-all duration-700
          ease-in-out
          ${
            isDark
              ? `
                translate-x-8
                rotate-[-20deg]
                bg-slate-800
                shadow-black/40
              `
              : `
                translate-x-1
                rotate-0
                bg-white
                shadow-amber-300/50
              `
          }
        `}
      >

        {/* Sun */}
        <Sun
          size={16}
          strokeWidth={2.2}
          className={`
            absolute
            text-amber-500
            transition-all duration-500
            ${
              isDark
                ? 'scale-0 rotate-90 opacity-0'
                : 'scale-100 rotate-0 opacity-100'
            }
          `}
        />

        {/* Moon */}
        <Moon
          size={16}
          strokeWidth={2.2}
          className={`
            absolute
            text-blue-200
            transition-all duration-500
            ${
              isDark
                ? 'scale-100 rotate-0 opacity-100'
                : 'scale-0 -rotate-90 opacity-0'
            }
          `}
        />

      </div>

      {/* ------------------------------------------------
          Day / Night Glow
      ------------------------------------------------ */}

      <div
        className={`
          pointer-events-none absolute
          h-10 w-10
          rounded-full
          blur-xl
          transition-all duration-700
          ${
            isDark
              ? 'right-1 bg-indigo-500/20'
              : 'left-0 bg-amber-300/40'
          }
        `}
      />
    </button>
  );
};

export default ThemeToggle;
