import { Component } from 'react';
import StatusMessage from './StatusMessage';

// Without a boundary, one render error (e.g. an unexpected API shape)
// unmounts the whole app to a blank page. Give it a `key` that changes on
// navigation so the next view gets a fresh boundary.
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('UI error', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <StatusMessage tone="error" onRetry={() => window.location.reload()}>
          Something went wrong displaying this page.
        </StatusMessage>
      );
    }
    return this.props.children;
  }
}
