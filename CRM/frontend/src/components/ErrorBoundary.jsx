import { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('UI error boundary', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="page-card">
          <h2>حدث خطأ في الواجهة</h2>
          <p>يرجى تحديث الصفحة أو العودة لاحقاً.</p>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
