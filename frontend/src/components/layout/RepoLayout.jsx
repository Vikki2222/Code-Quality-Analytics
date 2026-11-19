import { Link, NavLink, Outlet, useParams } from 'react-router';
import { ButtonLink } from '../ui/Button';

const TABS = [
  { to: '', label: 'Overview', end: true },
  { to: 'issues', label: 'Issues' },
  { to: 'pulls', label: 'Pull requests' },
  { to: 'reviews', label: 'Reviews' },
];

const tabClass = ({ isActive }) =>
  `-mb-px whitespace-nowrap border-b-2 px-3 py-2.5 text-[13px] transition-colors ${
    isActive ? 'border-accent text-fg' : 'border-transparent text-muted hover:text-fg'
  }`;

/** Header + tabs shared by every /repos/:owner/:repo/* page. */
export default function RepoLayout() {
  const { owner, repo } = useParams();
  const base = `/repos/${owner}/${repo}`;

  return (
    <div>
      <nav aria-label="Breadcrumb" className="mb-2 text-xs text-muted">
        <Link to="/repos" className="hover:text-fg">
          Repositories
        </Link>
        <span className="mx-1.5">/</span>
        <span>{owner}</span>
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <h1 className="truncate font-mono text-xl font-semibold text-fg">{repo}</h1>
          <a
            href={`https://github.com/${owner}/${repo}`}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-muted hover:text-fg"
          >
            GitHub ↗
          </a>
        </div>
        <ButtonLink to={`${base}/pulls`} variant="primary" size="md">
          Review a pull request
        </ButtonLink>
      </div>

      <div className="mt-4 overflow-x-auto border-b border-line">
        <nav className="flex" aria-label="Repository">
          {TABS.map((tab) => (
            <NavLink key={tab.label} to={tab.to ? `${base}/${tab.to}` : base} end={tab.end} className={tabClass}>
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="pt-6">
        <Outlet />
      </div>
    </div>
  );
}
