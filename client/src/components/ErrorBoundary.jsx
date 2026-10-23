import { Component } from 'react';

// Shows the error on screen instead of a blank page, so a crash is easy to report.
export default class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error(error, info.componentStack); }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{ maxWidth: 640, margin: '4rem auto', padding: '0 1rem', fontFamily: 'sans-serif' }}>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>Something went wrong</h1>
        <p style={{ marginTop: 8 }}>Please send this message to the developer:</p>
        <pre style={{ marginTop: 12, padding: 12, background: '#fee', border: '1px solid #fbb', borderRadius: 8, whiteSpace: 'pre-wrap' }}>
          {String(this.state.error?.stack || this.state.error)}
        </pre>
        <button onClick={() => location.reload()} style={{ marginTop: 12, padding: '8px 16px' }}>Reload</button>
      </div>
    );
  }
}
