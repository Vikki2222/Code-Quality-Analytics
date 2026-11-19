import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router';
import { useAuth } from '../../auth/AuthContext';
import Backdrop from '../Backdrop';
import { Logo } from '../Logo';

const navClass = ({ isActive }) =>
  `rounded-md px-2.5 py-1.5 text-[13px] transition-colors ${
    isActive ? 'bg-surface-2 text-fg' : 'text-muted hover:text-fg'
  }`;

function UserMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click or Escape (menu items close it themselves).
  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-md p-1 hover:bg-surface-2"
      >
        <img src={user.avatarUrl} alt="" className="size-7 rounded-full border border-line" />
        <span className="hidden text-[13px] text-fg-2 sm:inline">{user.username}</span>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-20 mt-2 w-48 rounded-lg border border-line-strong bg-surface-2 p-1 shadow-xl">
          <div className="px-3 py-2 text-xs text-muted">
            Signed in as <span className="text-fg">{user.username}</span>
          </div>
          <Link role="menuitem" to="/settings" onClick={() => setOpen(false)} className="block rounded-md px-3 py-2 text-[13px] text-fg-2 hover:bg-surface-3 hover:text-fg">
            Settings
          </Link>
          <button
            role="menuitem"
            type="button"
            onClick={onLogout}
            className="block w-full rounded-md px-3 py-2 text-left text-[13px] text-fg-2 hover:bg-surface-3 hover:text-fg"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

/** Signed-in frame: top bar + page content. */
export default function AppShell() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen">
      <Backdrop className="opacity-60" />
      <header className="sticky top-0 z-10 border-b border-line bg-base/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 md:px-6">
          <Link to="/repos" aria-label="Chronicles home">
            <Logo />
          </Link>
          <nav className="flex items-center gap-1" aria-label="Main">
            <NavLink to="/repos" className={navClass}>
              Repositories
            </NavLink>
            <NavLink to="/settings" className={navClass}>
              Settings
            </NavLink>
          </nav>
          <div className="ml-auto">
            <UserMenu user={user} onLogout={logout} />
          </div>
        </div>
      </header>
      <main className="relative mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
        <Outlet />
      </main>
    </div>
  );
}
