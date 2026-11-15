import { useState } from 'react';
import { Link } from 'react-router';
import { api } from '../api';
import { useAuth } from '../auth/AuthContext';
import { useApi } from '../lib/useApi';
import { Button } from '../components/ui/Button';
import { Panel } from '../components/ui/Card';
import { ErrorState, Skeleton } from '../components/ui/StatusMessage';

function CopyField({ value }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <code className="min-w-0 flex-1 truncate rounded-md border border-line bg-base px-3 py-1.5 font-mono text-xs text-fg-2">
        {value}
      </code>
      <Button
        size="sm"
        variant="secondary"
        onClick={() =>
          navigator.clipboard.writeText(value).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          })
        }
      >
        {copied ? 'Copied' : 'Copy'}
      </Button>
    </div>
  );
}

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { data, error, loading, reload } = useApi(() => api.getTrackedRepos(), []);
  const [removing, setRemoving] = useState(null);
  const webhookUrl = `${window.location.origin}/api/webhooks/github`;

  async function untrack(repo) {
    setRemoving(`${repo.owner}/${repo.name}`);
    try {
      await api.untrackRepo(repo.owner, repo.name);
      reload();
    } finally {
      setRemoving(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-extrabold tracking-tight text-fg">Settings</h1>

      <Panel title="Account">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img src={user.avatarUrl} alt="" className="size-10 rounded-full border border-line" />
            <div>
              <div className="text-[13px] text-fg">{user.username}</div>
              <div className="text-xs text-muted">{user.email || 'Signed in with GitHub'}</div>
            </div>
          </div>
          <Button variant="secondary" onClick={logout}>
            Sign out
          </Button>
        </div>
      </Panel>

      <Panel title="Tracked repositories" subtitle="Untracking hides a repository from your Portfolio; its history is kept." bodyClassName="">
        {loading && !data && <Skeleton className="m-4 h-20" />}
        {error && <ErrorState error={error} what="tracked repositories" onRetry={reload} compact />}
        {data && data.repos.length === 0 && (
          <p className="px-4 py-6 text-[13px] text-muted">
            You're not tracking any repositories yet.{' '}
            <Link to="/repos" className="text-accent hover:underline">
              Add one →
            </Link>
          </p>
        )}
        {data && data.repos.length > 0 && (
          <ul className="divide-y divide-line">
            {data.repos.map((repo) => (
              <li key={`${repo.owner}/${repo.name}`} className="flex items-center justify-between gap-3 px-4 py-3">
                <Link to={`/repos/${repo.owner}/${repo.name}`} className="truncate font-mono text-[13px] text-fg hover:text-accent">
                  {repo.owner}/{repo.name}
                </Link>
                <Button
                  size="sm"
                  variant="danger"
                  disabled={removing !== null}
                  onClick={() => untrack(repo)}
                >
                  {removing === `${repo.owner}/${repo.name}` ? 'Removing…' : 'Untrack'}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Automatic reviews (webhooks)" subtitle="Review every pull request as it's opened or updated">
        <ol className="list-decimal space-y-3 pl-5 text-[13px] text-fg-2">
          <li>
            In your repository on GitHub, open <span className="text-fg">Settings → Webhooks → Add webhook</span>.
          </li>
          <li>
            Payload URL:
            <div className="mt-1.5">
              <CopyField value={webhookUrl} />
            </div>
          </li>
          <li>
            Content type: <code className="font-mono text-fg">application/json</code>
          </li>
          <li>Secret: the webhook secret your Chronicles administrator configured.</li>
          <li>
            Events: choose <span className="text-fg">Let me select individual events</span> and tick only{' '}
            <span className="text-fg">Pull requests</span>.
          </li>
        </ol>
        <p className="mt-4 rounded-md border border-line bg-base px-3 py-2 text-xs text-muted">
          Automatic reviews currently work for repositories owned by your own GitHub account. Organisation-owned
          repositories can still be reviewed manually from their Pull requests tab.
        </p>
      </Panel>
    </div>
  );
}
