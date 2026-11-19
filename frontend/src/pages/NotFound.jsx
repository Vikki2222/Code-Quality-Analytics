import { ButtonLink } from '../components/ui/Button';
import { StatusMessage } from '../components/ui/StatusMessage';

export default function NotFound() {
  return (
    <StatusMessage
      title="Page not found"
      action={
        <ButtonLink to="/repos" variant="secondary">
          Go to repositories
        </ButtonLink>
      }
    >
      The link may be out of date, or the page was moved.
    </StatusMessage>
  );
}
