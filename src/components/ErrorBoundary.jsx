import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("React ErrorBoundary capturó un error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '2rem',
          backgroundColor: 'var(--color-bg-dark, #EEF2F6)',
          color: 'var(--color-text-dark, #1A3644)',
          fontFamily: 'sans-serif'
        }}>
          <div style={{
            background: 'var(--color-surface, #FFFFFF)',
            border: '1px solid var(--color-border, #D1DCE5)',
            borderRadius: '12px',
            padding: '2.5rem',
            maxWidth: '500px',
            textAlign: 'center',
            boxShadow: '0 8px 30px rgba(0,0,0,0.12)'
          }}>
            <h2 style={{ color: 'var(--color-accent-red, #D32F2F)', marginBottom: '1rem' }}>
              ⚠️ Algo salió mal al cargar la vista
            </h2>
            <p style={{ color: 'var(--color-text-light, #627D98)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
              {this.state.error?.message || "Se produjo un error inesperado en la interfaz."}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              style={{
                background: 'var(--color-primary, #1A3644)',
                color: '#FFFFFF',
                border: 'none',
                padding: '0.8rem 1.5rem',
                borderRadius: '6px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              🔄 Recargar Aplicación
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
