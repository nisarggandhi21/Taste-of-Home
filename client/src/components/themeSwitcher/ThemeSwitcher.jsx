import { useContext } from 'react';
import { ThemeContext } from '../../context/ThemeContext';
import './ThemeSwitcher.scss';

const icon = (path) => (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
    <g
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {path}
    </g>
  </svg>
);

const OPTIONS = [
  {
    value: 'light',
    label: 'Light',
    icon: icon(
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </>
    ),
  },
  {
    value: 'dark',
    label: 'Dark',
    icon: icon(<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />),
  },
  {
    value: 'glass',
    label: 'Glass',
    icon: icon(
      <>
        <rect x="4" y="4" width="12" height="12" rx="3" />
        <path d="M9 20h8a3 3 0 0 0 3-3V9" />
      </>
    ),
  },
];

// Three-way choice between the light, dark and glass themes. Wide screens get all three
// side by side; phones get one button that steps through them.
const ThemeSwitcher = () => {
  const { theme, setTheme } = useContext(ThemeContext);
  const current = OPTIONS.find((option) => option.value === theme) || OPTIONS[0];
  const next = OPTIONS[(OPTIONS.indexOf(current) + 1) % OPTIONS.length];

  return (
    <>
      <button
        type="button"
        className="themeCycle"
        aria-label={`Theme: ${current.label}. Switch to ${next.label}`}
        title={`Theme: ${current.label}`}
        onClick={() => setTheme(next.value)}
      >
        {current.icon}
      </button>
      <div className="themeSwitcher" role="radiogroup" aria-label="Theme">
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={theme === option.value}
            aria-label={`${option.label} theme`}
            title={`${option.label} theme`}
            className={theme === option.value ? 'option selected' : 'option'}
            onClick={() => setTheme(option.value)}
          >
            {option.icon}
          </button>
        ))}
      </div>
    </>
  );
};

export default ThemeSwitcher;
