import { Component } from 'react';
import { StatusMessage } from './ui/StatusMessage';

// Without a boundary, one render error (e.g. an unexpected API shape)
// unmounts the whole app to a blank page. When `resetKey` changes (e.g. the
// route), a previous error is cleared so the next page renders normally.
export default class ErrorBoundary extends Component {
  state = { error: null, resetKey: this.props.resetKey };

  static getDerivedStateFromError(error) {
    return { error };
  }

  static getDerivedStateFromProps(props, state) {
    return props.resetKey !== state.resetKey ? { error: null, resetKey: props.resetKey } : null;
  }

  componentDidCatch(error, info) {
    console.error('UI error', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <StatusMessage tone="error" title="Something went wrong displaying this page" onRetry={() => window.location.reload()}>
          If this keeps happening after a reload, the app may have just been updated.
        </StatusMessage>
      );
    }
    return this.props.children;
  }
}
