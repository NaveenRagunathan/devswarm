/**
 * Output Console Component
 * 
 * Displays code execution results with tabs for output, errors, and execution info
 */

import { useState } from 'react';
import { Copy, Trash2, Terminal, AlertCircle, Info, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { ExecutionResult } from '../hooks/useCodeExecution';
import { cn } from '../lib/utils';

interface OutputConsoleProps {
  result: ExecutionResult | null;
  loading: boolean;
  onClear: () => void;
}

type Tab = 'output' | 'errors' | 'info';

export function OutputConsole({ result, loading, onClear }: OutputConsoleProps) {
  const [activeTab, setActiveTab] = useState<Tab>('output');

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const hasOutput = result?.output && result.output.length > 0;
  const hasError = result?.error && result.error.length > 0;

  return (
    <div className="flex flex-col h-full bg-gray-900 text-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <Terminal className="w-4 h-4 text-green-400" />
          <span className="text-sm font-medium">Console</span>
        </div>
        <div className="flex items-center space-x-2">
          {result && (
            <button
              onClick={() => copyToClipboard(result.output || result.error || '')}
              className="p-1 hover:bg-gray-700 rounded transition-colors"
              title="Copy output"
            >
              <Copy className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClear}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
            title="Clear console"
            disabled={!result}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-1 px-4 py-2 bg-gray-800 border-b border-gray-700">
        <button
          onClick={() => setActiveTab('output')}
          className={cn(
            "px-3 py-1 text-sm rounded transition-colors",
            activeTab === 'output'
              ? "bg-gray-700 text-white"
              : "text-gray-400 hover:text-gray-200 hover:bg-gray-700/50"
          )}
        >
          <div className="flex items-center space-x-1">
            <Terminal className="w-3 h-3" />
            <span>Output</span>
            {hasOutput && <span className="ml-1 px-1.5 py-0.5 bg-green-600 text-white text-xs rounded-full">{result.output.split('\n').length}</span>}
          </div>
        </button>
        <button
          onClick={() => setActiveTab('errors')}
          className={cn(
            "px-3 py-1 text-sm rounded transition-colors",
            activeTab === 'errors'
              ? "bg-gray-700 text-white"
              : "text-gray-400 hover:text-gray-200 hover:bg-gray-700/50"
          )}
        >
          <div className="flex items-center space-x-1">
            <AlertCircle className="w-3 h-3" />
            <span>Errors</span>
            {hasError && <span className="ml-1 px-1.5 py-0.5 bg-red-600 text-white text-xs rounded-full">!</span>}
          </div>
        </button>
        <button
          onClick={() => setActiveTab('info')}
          className={cn(
            "px-3 py-1 text-sm rounded transition-colors",
            activeTab === 'info'
              ? "bg-gray-700 text-white"
              : "text-gray-400 hover:text-gray-200 hover:bg-gray-700/50"
          )}
        >
          <div className="flex items-center space-x-1">
            <Info className="w-3 h-3" />
            <span>Info</span>
          </div>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 font-mono text-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400 mb-3"></div>
            <p>Executing code...</p>
          </div>
        ) : !result ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Terminal className="w-12 h-12 mb-3 opacity-50" />
            <p>Run code to see output here</p>
            <p className="text-xs mt-2">Press Cmd/Ctrl + Enter to run</p>
          </div>
        ) : (
          <>
            {/* Output Tab */}
            {activeTab === 'output' && (
              <div>
                {hasOutput ? (
                  <pre className="whitespace-pre-wrap text-green-400">
                    {result.output.split('\n').map((line, idx) => (
                      <div key={idx} className="hover:bg-gray-800/50">
                        <span className="text-gray-600 select-none mr-4">{idx + 1}</span>
                        {line || '\u00A0'}
                      </div>
                    ))}
                  </pre>
                ) : (
                  <div className="text-gray-500 italic">No output produced</div>
                )}
              </div>
            )}

            {/* Errors Tab */}
            {activeTab === 'errors' && (
              <div>
                {hasError ? (
                  <div className="space-y-2">
                    <div className="flex items-start space-x-2 text-red-400">
                      <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="font-semibold mb-1">Error occurred:</div>
                        <pre className="whitespace-pre-wrap">{result.error}</pre>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 text-green-400">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>No errors</span>
                  </div>
                )}
              </div>
            )}

            {/* Info Tab */}
            {activeTab === 'info' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-gray-800">
                  <span className="text-gray-400">Language:</span>
                  <span className="text-white font-semibold capitalize">{result.language}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-800">
                  <span className="text-gray-400">Execution Time:</span>
                  <span className="text-white font-semibold flex items-center space-x-1">
                    <Clock className="w-4 h-4" />
                    <span>{result.executionTime}ms</span>
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-800">
                  <span className="text-gray-400">Exit Code:</span>
                  <span className={cn(
                    "font-semibold",
                    result.exitCode === 0 ? "text-green-400" : "text-red-400"
                  )}>
                    {result.exitCode}
                  </span>
                </div>
                {result.timestamp && (
                  <div className="flex items-center justify-between py-2 border-b border-gray-800">
                    <span className="text-gray-400">Timestamp:</span>
                    <span className="text-white text-xs">
                      {new Date(result.timestamp).toLocaleString()}
                    </span>
                  </div>
                )}
                {result.requestId && (
                  <div className="flex items-center justify-between py-2">
                    <span className="text-gray-400">Request ID:</span>
                    <code className="text-white text-xs bg-gray-800 px-2 py-1 rounded">
                      {result.requestId.slice(0, 8)}
                    </code>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
