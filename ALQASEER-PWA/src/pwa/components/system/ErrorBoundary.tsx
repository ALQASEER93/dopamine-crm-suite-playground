import React from "react";

type ErrorBoundaryState = { hasError: boolean };
type ErrorBoundaryProps = React.PropsWithChildren<{ fallback?: React.ReactNode }>;

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("PWA error boundary caught", error);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }
      return (
        <div className="card">
          <div className="section-title">حدث خطأ غير متوقع</div>
          <div className="muted">يرجى تحديث الصفحة أو المحاولة لاحقًا.</div>
        </div>
      );
    }
    return this.props.children;
  }
}
