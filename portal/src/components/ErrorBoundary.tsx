import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    console.error('🚨 ERROR BOUNDARY: Caught error:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🚨 ERROR BOUNDARY: Error details:', error);
    console.error('🚨 ERROR BOUNDARY: Error info:', errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 border border-red-500 bg-red-50 rounded-lg">
          <h2 className="text-lg font-bold text-red-600 mb-2">Something went wrong</h2>
          <p className="text-red-600 mb-2">Error: {this.state.error?.message}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: undefined })}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
