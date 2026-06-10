import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

/**
 * Class-based error boundary. Wrap the whole app AND each route individually so a
 * crash in one page never blanks the entire tree.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('[GoodSeed ErrorBoundary]', error, info)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/40">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Something went wrong here
            </h2>
            <p className="mt-1 max-w-md text-sm text-gray-500 dark:text-gray-400">
              {this.props.label
                ? `The "${this.props.label}" section hit an error, but the rest of the app is fine.`
                : 'This section hit an error, but the rest of the app is fine.'}
            </p>
            {this.state.error?.message && (
              <pre className="mx-auto mt-3 max-w-md overflow-auto rounded-lg bg-gray-100 p-3 text-left text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                {String(this.state.error.message)}
              </pre>
            )}
          </div>
          <button
            onClick={this.handleReset}
            className="inline-flex items-center gap-2 rounded-lg bg-seed-600 px-4 py-2 text-sm font-semibold text-white hover:bg-seed-700"
          >
            <RefreshCw className="h-4 w-4" /> Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
