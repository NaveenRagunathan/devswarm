/**
 * DevSwarm - Complete IDE Implementation
 * This is a comprehensive replacement for App.tsx with full IDE features
 */

import { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import toast, { Toaster } from 'react-hot-toast';
import { Play, Sparkles, Code2, GitFork, Search, Database, Clock, ChevronDown, Shield, Zap, Eye, CheckCircle2, Loader2, AlertCircle, Info, XCircle, AlertTriangle, ChevronUp } from 'lucide-react';
import { cn } from './lib/utils';
import { OutputConsole } from './components/OutputConsole';
import { useCodeExecution } from './hooks/useCodeExecution';
import { useCodeAnalysis } from './hooks/useCodeAnalysis';
import { getExamplesForLanguage } from './data/exampleSnippets';

// Agent icon mapping
const AGENT_ICONS: Record<string, any> = {
  'security': Shield,
  'performance': Zap,
  'accessibility': Eye,
  'best-practices': CheckCircle2,
};

// Severity colors and icons
const SEVERITY_CONFIG = {
  critical: { color: 'text-red-600 bg-red-50 border-red-200', icon: XCircle, label: 'Critical' },
  high: { color: 'text-orange-600 bg-orange-50 border-orange-200', icon: AlertTriangle, label: 'High' },
  medium: { color: 'text-yellow-600 bg-yellow-50 border-yellow-200', icon: AlertCircle, label: 'Medium' },
  low: { color: 'text-blue-600 bg-blue-50 border-blue-200', icon: Info, label: 'Low' },
  info: { color: 'text-gray-600 bg-gray-50 border-gray-200', icon: Info, label: 'Info' },
};

const DEFAULT_CODE = `function processUserData(data) {
  const result = eval(data.input);
  for (let i = 0; i < data.items.length; i++) {
    console.log(data.items[i]);
  }
  return result;
}

const testData = { input: '2 + 2', items: [1, 2, 3] };
const output = processUserData(testData);
console.log('Result:', output);`;

export default function App() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [language, setLanguage] = useState<'javascript' | 'python' | 'typescript'>('javascript');
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [expandedFinding, setExpandedFinding] = useState<string | null>(null);
  
  const { execute, result: execResult, loading: execLoading, clear: clearExec } = useCodeExecution();
  const { agents, isAnalyzing, analyze, reset, totalExecutionTime, tigerStats } = useCodeAnalysis();

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleRun();
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        handleAnalyze();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'l') {
        e.preventDefault();
        clearExec();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [code, language]);

  const handleRun = async () => {
    try {
      toast.loading('Executing code...', { id: 'exec' });
      await execute(code, language);
      toast.success('Code executed!', { id: 'exec' });
    } catch {
      toast.error('Execution failed', { id: 'exec' });
    }
  };

  const handleAnalyze = async () => {
    try {
      toast.loading('Starting analysis...', { id: 'analyze' });
      await analyze(code, language);
      toast.success('Analysis complete!', { id: 'analyze' });
    } catch (error) {
      toast.error('Analysis failed', { id: 'analyze' });
      console.error('Analysis error:', error);
    }
  };

  const loadExample = (exampleCode: string) => {
    setCode(exampleCode);
    toast.success('Example loaded!');
  };

  const examples = getExamplesForLanguage(language);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <Toaster position="top-right" />
      
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-2 rounded-lg">
                <Code2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">DevSwarm</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">AI-Powered Code Analysis</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Tiger Cloud Connected</span>
            </div>
          </div>
        </div>
      </header>

      {/* Tiger Stats Banner */}
      {(isAnalyzing || totalExecutionTime > 0) && (
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <GitFork className="w-4 h-4" />
                  <span>{tigerStats.forksCreated} Forks Created</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Search className="w-4 h-4" />
                  <span>{tigerStats.patternsSearched} Patterns Searched</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Database className="w-4 h-4" />
                  <span>{tigerStats.queriesExecuted} Queries Executed</span>
                </div>
              </div>
              {totalExecutionTime > 0 && (
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4" />
                  <span>{(totalExecutionTime / 1000).toFixed(1)}s total</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main IDE Layout */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Editor + Console */}
          <div className="lg:col-span-2 space-y-4">
            {/* Editor */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
              <div className="border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as any)}
                    className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="javascript">JavaScript</option>
                    <option value="python">Python</option>
                    <option value="typescript">TypeScript</option>
                  </select>
                  
                  {examples.length > 0 && (
                    <select
                      onChange={(e) => {
                        const example = examples[parseInt(e.target.value)];
                        if (example) loadExample(example.code);
                      }}
                      className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      defaultValue=""
                    >
                      <option value="" disabled>Try Example...</option>
                      {examples.map((ex, idx) => (
                        <option key={idx} value={idx}>{ex.name}</option>
                      ))}
                    </select>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleRun}
                    disabled={execLoading}
                    className={cn(
                      "flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all",
                      execLoading
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                        : "bg-green-600 text-white hover:bg-green-700 shadow-md hover:shadow-lg"
                    )}
                  >
                    {execLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    <span>Run</span>
                  </button>
                  
                  <button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                    className={cn(
                      "flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all",
                      isAnalyzing
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                        : "bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 shadow-md hover:shadow-lg"
                    )}
                  >
                    {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    <span>Analyze</span>
                  </button>
                </div>
              </div>
              
              <div className="h-[400px]">
                <Editor
                  height="100%"
                  language={language}
                  value={code}
                  onChange={(value) => setCode(value || '')}
                  theme="vs-dark"
                  options={{
                    minimap: { enabled: true },
                    fontSize: 14,
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                  }}
                />
              </div>
            </div>

            {/* Console */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden h-[300px]">
              <OutputConsole result={execResult} loading={execLoading} onClear={clearExec} />
            </div>
          </div>

          {/* Agents Panel */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Active Agents</h3>
              <div className="space-y-3">
                {agents.map((agent) => {
                  const Icon = AGENT_ICONS[agent.specialty] || Shield;
                  const isExpanded = expandedAgent === agent.id;
                  const findingsCount = agent.findings?.length || 0;
                  
                  return (
                    <div key={agent.id} className="rounded-lg border-2 border-gray-200 dark:border-gray-700 overflow-hidden">
                      <div 
                        className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                        onClick={() => setExpandedAgent(isExpanded ? null : agent.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3 flex-1">
                            <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700">
                              <Icon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900 dark:text-white">{agent.name}</h4>
                              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{agent.specialty}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {agent.status === 'analyzing' && (
                              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                            )}
                            {agent.status === 'completed' && findingsCount > 0 && (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-600">
                                {findingsCount}
                              </span>
                            )}
                            {agent.status === 'completed' && findingsCount === 0 && (
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                            )}
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </div>
                        
                        {agent.status === 'analyzing' && agent.progress !== undefined && (
                          <div className="mt-3">
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div 
                                className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                                style={{ width: `${agent.progress}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {isExpanded && agent.findings && agent.findings.length > 0 && (
                        <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900/50">
                          <div className="space-y-3">
                            {agent.findings.map((finding, idx) => {
                              const severityConfig = SEVERITY_CONFIG[finding.severity];
                              const SeverityIcon = severityConfig.icon;
                              const findingId = `${agent.id}-${idx}`;
                              const isFindingExpanded = expandedFinding === findingId;
                              
                              return (
                                <div key={idx} className={cn(
                                  "p-3 rounded-lg border",
                                  severityConfig.color
                                )}>
                                  <div 
                                    className="cursor-pointer"
                                    onClick={() => setExpandedFinding(isFindingExpanded ? null : findingId)}
                                  >
                                    <div className="flex items-start space-x-2">
                                      <SeverityIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                          <span className="text-xs font-semibold uppercase">{severityConfig.label}</span>
                                          {finding.line_start && (
                                            <span className="text-xs">Line {finding.line_start}</span>
                                          )}
                                        </div>
                                        <p className="text-sm font-medium mt-1">{finding.message}</p>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {isFindingExpanded && (
                                    <div className="mt-3 space-y-2 text-sm">
                                      {finding.code_snippet && (
                                        <div className="bg-gray-900 text-gray-100 p-2 rounded text-xs font-mono overflow-x-auto">
                                          <pre>{finding.code_snippet}</pre>
                                        </div>
                                      )}
                                      {finding.suggestion && (
                                        <div className="bg-white dark:bg-gray-800 p-2 rounded">
                                          <p className="text-xs font-semibold mb-1">Suggestion:</p>
                                          <p className="text-xs">{finding.suggestion}</p>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      
                      {isExpanded && agent.findings && agent.findings.length === 0 && agent.status === 'completed' && (
                        <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900/50 text-center">
                          <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
                          <p className="text-sm text-gray-600 dark:text-gray-400">No issues found</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-12 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <div>Built for Tiger Data Challenge</div>
            <div className="flex items-center space-x-4">
              <span>Powered by Tiger Cloud</span>
              <span>•</span>
              <span>React + TypeScript + PostgreSQL</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
