import { useState } from 'react';
import Editor from '@monaco-editor/react';
import { 
  Play, 
  Shield, 
  Zap, 
  Eye, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Code2,
  AlertTriangle,
  Info,
  XCircle,
  ChevronDown,
  ChevronUp,
  Database,
  GitFork,
  Search,
  Clock,
  TrendingUp,
  Download,
  Sparkles
} from 'lucide-react';
import { cn } from './lib/utils';

interface Finding {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: string;
  message: string;
  line_start?: number;
  line_end?: number;
  suggestion?: string;
  code_snippet?: string;
  confidence?: number;
}

interface ForkDetails {
  fork_id: string;
  created_at: string;
  queries_executed: number;
  patterns_matched: number;
  execution_time_ms: number;
  similar_patterns: Array<{
    pattern: string;
    similarity: number;
  }>;
}

interface Agent {
  id: string;
  name: string;
  specialty: string;
  icon: any;
  status: 'idle' | 'creating_fork' | 'analyzing' | 'searching' | 'completed' | 'error';
  findings?: Finding[];
  forkDetails?: ForkDetails;
  progress?: number;
}

const AGENTS: Agent[] = [
  { id: '1', name: 'Security Agent', specialty: 'security', icon: Shield, status: 'idle' },
  { id: '2', name: 'Performance Agent', specialty: 'performance', icon: Zap, status: 'idle' },
  { id: '3', name: 'Accessibility Agent', specialty: 'accessibility', icon: Eye, status: 'idle' },
  { id: '4', name: 'Best Practices Agent', specialty: 'best-practices', icon: CheckCircle2, status: 'idle' },
];

const SAMPLE_CODE = `function processUserData(data) {
  // Sample code for analysis
  const result = eval(data.input); // Security issue
  
  for (let i = 0; i < data.items.length; i++) {
    console.log(data.items[i]); // Performance issue
  }
  
  return result;
}`;

function App() {
  const [code, setCode] = useState(SAMPLE_CODE);
  const [language, setLanguage] = useState('javascript');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [agents, setAgents] = useState<Agent[]>(AGENTS);
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [totalExecutionTime, setTotalExecutionTime] = useState(0);
  const [tigerStats, setTigerStats] = useState({
    forksCreated: 0,
    patternsSearched: 0,
    queriesExecuted: 0,
  });

  const generateMockFindings = (specialty: string): Finding[] => {
    const findings: Finding[] = [];
    
    if (specialty === 'security') {
      findings.push({
        severity: 'critical',
        category: 'security',
        message: 'Use of eval() is dangerous and can lead to code injection',
        line_start: 3,
        line_end: 3,
        suggestion: 'Avoid eval(). Use safer alternatives like JSON.parse() for data',
        code_snippet: '  const result = eval(data.input); // Security issue',
        confidence: 98
      });
      findings.push({
        severity: 'high',
        category: 'security',
        message: 'Unvalidated user input processed directly',
        line_start: 3,
        suggestion: 'Validate and sanitize all user inputs before processing',
        confidence: 92
      });
    }
    
    if (specialty === 'performance') {
      findings.push({
        severity: 'medium',
        category: 'performance',
        message: 'Console statements can impact performance in production',
        line_start: 6,
        suggestion: 'Remove console statements or use a logging library with levels',
        code_snippet: '    console.log(data.items[i]); // Performance issue',
        confidence: 85
      });
      findings.push({
        severity: 'low',
        category: 'performance',
        message: 'Consider using array methods like forEach or map',
        line_start: 5,
        suggestion: 'Use data.items.forEach() for better readability',
        confidence: 78
      });
      findings.push({
        severity: 'info',
        category: 'performance',
        message: 'Function could benefit from early returns',
        suggestion: 'Add input validation at the start of the function',
        confidence: 72
      });
      findings.push({
        severity: 'low',
        category: 'performance',
        message: 'Variable could be declared as const',
        line_start: 5,
        suggestion: 'Use const for loop variables when possible',
        confidence: 80
      });
    }
    
    if (specialty === 'accessibility') {
      findings.push({
        severity: 'info',
        category: 'accessibility',
        message: 'Function lacks descriptive comments for screen readers',
        suggestion: 'Add JSDoc comments describing the function purpose',
        confidence: 65
      });
    }
    
    if (specialty === 'best-practices') {
      findings.push({
        severity: 'low',
        category: 'best-practices',
        message: 'Function name could be more descriptive',
        suggestion: 'Consider renaming to processAndValidateUserData',
        confidence: 70
      });
    }
    
    return findings;
  };

  const generateForkDetails = (agentId: string): ForkDetails => {
    return {
      fork_id: `fork_${agentId}_${Date.now().toString(36)}`,
      created_at: new Date().toISOString(),
      queries_executed: Math.floor(Math.random() * 15) + 5,
      patterns_matched: Math.floor(Math.random() * 8) + 2,
      execution_time_ms: Math.floor(Math.random() * 1500) + 500,
      similar_patterns: [
        { pattern: 'eval() usage in user input', similarity: 0.94 },
        { pattern: 'unvalidated data processing', similarity: 0.87 },
        { pattern: 'console.log in production', similarity: 0.82 },
      ].slice(0, Math.floor(Math.random() * 3) + 1)
    };
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setTigerStats({ forksCreated: 0, patternsSearched: 0, queriesExecuted: 0 });
    const startTime = Date.now();
    
    // Simulate agent analysis with fork creation
    for (let i = 0; i < agents.length; i++) {
      // Step 1: Creating fork
      setAgents(prev => prev.map((agent, idx) => 
        idx === i ? { ...agent, status: 'creating_fork' as const, progress: 0 } : agent
      ));
      await new Promise(resolve => setTimeout(resolve, 600));
      
      const forkDetails = generateForkDetails(agents[i].id);
      setTigerStats(prev => ({ ...prev, forksCreated: prev.forksCreated + 1 }));
      
      // Step 2: Analyzing
      setAgents(prev => prev.map((agent, idx) => 
        idx === i ? { ...agent, status: 'analyzing' as const, progress: 33, forkDetails } : agent
      ));
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Step 3: Searching patterns
      setAgents(prev => prev.map((agent, idx) => 
        idx === i ? { ...agent, status: 'searching' as const, progress: 66 } : agent
      ));
      await new Promise(resolve => setTimeout(resolve, 700));
      
      setTigerStats(prev => ({ 
        ...prev, 
        patternsSearched: prev.patternsSearched + forkDetails.patterns_matched,
        queriesExecuted: prev.queriesExecuted + forkDetails.queries_executed
      }));
      
      // Step 4: Completed
      const mockFindings = generateMockFindings(agents[i].specialty);
      setAgents(prev => prev.map((agent, idx) => 
        idx === i ? { 
          ...agent, 
          status: 'completed' as const,
          progress: 100,
          findings: mockFindings
        } : agent
      ));
    }
    
    setTotalExecutionTime(Date.now() - startTime);
    setIsAnalyzing(false);
  };

  const getStatusColor = (status: Agent['status']) => {
    switch (status) {
      case 'idle': return 'bg-gray-200 text-gray-600';
      case 'creating_fork': return 'bg-purple-100 text-purple-600 animate-pulse';
      case 'analyzing': return 'bg-blue-100 text-blue-600 animate-pulse';
      case 'searching': return 'bg-yellow-100 text-yellow-600 animate-pulse';
      case 'completed': return 'bg-green-100 text-green-600';
      case 'error': return 'bg-red-100 text-red-600';
    }
  };

  const getStatusText = (status: Agent['status']) => {
    switch (status) {
      case 'idle': return 'Idle';
      case 'creating_fork': return 'Creating Fork...';
      case 'analyzing': return 'Analyzing...';
      case 'searching': return 'Searching Patterns...';
      case 'completed': return 'Completed';
      case 'error': return 'Error';
    }
  };

  const getSeverityIcon = (severity: Finding['severity']) => {
    switch (severity) {
      case 'critical': return <XCircle className="w-5 h-5 text-red-600" />;
      case 'high': return <AlertCircle className="w-5 h-5 text-orange-600" />;
      case 'medium': return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'low': return <Info className="w-5 h-5 text-blue-600" />;
      case 'info': return <Info className="w-5 h-5 text-gray-600" />;
    }
  };

  const getSeverityColor = (severity: Finding['severity']) => {
    switch (severity) {
      case 'critical': return 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800';
      case 'high': return 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800';
      case 'medium': return 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800';
      case 'low': return 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800';
      case 'info': return 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700';
    }
  };

  const allFindings = agents.flatMap(agent => 
    (agent.findings || []).map(finding => ({ ...finding, agentName: agent.name, agentIcon: agent.icon }))
  );

  const totalFindings = allFindings.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-2 rounded-lg">
                <Code2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  DevSwarm
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Multi-Agent Code Analysis Platform
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Tiger Cloud Connected</span>
            </div>
          </div>
        </div>
      </header>

      {/* Tiger Cloud Integration Status Banner */}
      {(isAnalyzing || totalExecutionTime > 0) && (
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <GitFork className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {tigerStats.forksCreated} Forks Created
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Search className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {tigerStats.patternsSearched} Patterns Searched
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Database className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {tigerStats.queriesExecuted} Queries Executed
                  </span>
                </div>
              </div>
              {totalExecutionTime > 0 && (
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {(totalExecutionTime / 1000).toFixed(1)}s total
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Code Editor Section */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
              <div className="border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Code Editor
                  </h2>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="javascript">JavaScript</option>
                    <option value="typescript">TypeScript</option>
                    <option value="python">Python</option>
                    <option value="java">Java</option>
                  </select>
                </div>
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
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Analyzing...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      <span>Analyze Code</span>
                    </>
                  )}
                </button>
              </div>
              <div className="h-[500px]">
                <Editor
                  height="100%"
                  language={language}
                  value={code}
                  onChange={(value) => setCode(value || '')}
                  theme="vs-dark"
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                  }}
                />
              </div>
            </div>

            {/* Results Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Analysis Results
                  </h3>
                  {totalFindings > 0 && (
                    <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium">
                      {totalFindings} {totalFindings === 1 ? 'Finding' : 'Findings'}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="p-6">
                {isAnalyzing ? (
                  <div className="text-center py-12">
                    <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">Agents are analyzing your code...</p>
                  </div>
                ) : totalFindings === 0 ? (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    {agents.some(a => a.status === 'completed') ? (
                      <div className="space-y-2">
                        <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
                        <p className="font-medium">No issues found!</p>
                        <p className="text-sm">Your code looks good.</p>
                      </div>
                    ) : (
                      <p>Click "Analyze Code" to start multi-agent analysis</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {allFindings.map((finding, index) => {
                      const AgentIcon = finding.agentIcon;
                      return (
                        <div
                          key={index}
                          className={cn(
                            "border-2 rounded-lg p-4 transition-all",
                            getSeverityColor(finding.severity)
                          )}
                        >
                          <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0 mt-1">
                              {getSeverityIcon(finding.severity)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <div className="flex items-center space-x-2 mb-1">
                                    <span className="px-2 py-0.5 bg-white dark:bg-gray-900 rounded text-xs font-medium uppercase text-gray-700 dark:text-gray-300">
                                      {finding.severity}
                                    </span>
                                    {finding.confidence && (
                                      <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs font-medium">
                                        {finding.confidence}% confident
                                      </span>
                                    )}
                                    {finding.line_start && (
                                      <span className="text-xs text-gray-500 dark:text-gray-400">
                                        Line {finding.line_start}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    {finding.message}
                                  </p>
                                </div>
                                <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400 ml-4">
                                  <AgentIcon className="w-3 h-3" />
                                  <span>{finding.agentName}</span>
                                </div>
                              </div>
                              
                              {finding.code_snippet && (
                                <div className="mt-2 mb-2">
                                  <pre className="bg-gray-900 text-gray-100 p-3 rounded text-xs overflow-x-auto">
                                    <code>{finding.code_snippet}</code>
                                  </pre>
                                </div>
                              )}
                              
                              {finding.suggestion && (
                                <div className="mt-2 flex items-start space-x-2 text-sm">
                                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                                  <p className="text-gray-700 dark:text-gray-300">
                                    <span className="font-medium">Suggestion:</span> {finding.suggestion}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Agents Panel */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Active Agents
              </h3>
              <div className="space-y-3">
                {agents.map((agent) => {
                  const Icon = agent.icon;
                  const isExpanded = expandedAgent === agent.id;
                  return (
                    <div
                      key={agent.id}
                      className={cn(
                        "p-4 rounded-lg border-2 transition-all",
                        agent.status === 'creating_fork' || agent.status === 'analyzing' || agent.status === 'searching'
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" 
                          : agent.status === 'completed'
                          ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                          : "border-gray-200 dark:border-gray-700"
                      )}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-start space-x-3">
                          <div className={cn(
                            "p-2 rounded-lg",
                            agent.status !== 'idle' && agent.status !== 'completed' ? "bg-blue-100 dark:bg-blue-800" :
                            agent.status === 'completed' ? "bg-green-100 dark:bg-green-800" :
                            "bg-gray-100 dark:bg-gray-700"
                          )}>
                            {agent.status !== 'idle' && agent.status !== 'completed' ? (
                              <Loader2 className="w-5 h-5 text-blue-600 dark:text-blue-300 animate-spin" />
                            ) : (
                              <Icon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                            )}
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white">
                              {agent.name}
                            </h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                              {agent.specialty}
                            </p>
                          </div>
                        </div>
                        <span className={cn(
                          "px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap",
                          getStatusColor(agent.status)
                        )}>
                          {getStatusText(agent.status)}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      {agent.progress !== undefined && agent.progress < 100 && (
                        <div className="mb-3">
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${agent.progress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Findings Count */}
                      {agent.findings && agent.findings.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">Findings:</span>
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {agent.findings.length}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Fork Details Toggle */}
                      {agent.forkDetails && (
                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                          <button
                            onClick={() => setExpandedAgent(isExpanded ? null : agent.id)}
                            className="w-full flex items-center justify-between text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                          >
                            <span className="font-medium">Fork Details</span>
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                          
                          {isExpanded && (
                            <div className="mt-3 space-y-2 text-xs">
                              <div className="flex items-center justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Fork ID:</span>
                                <code className="text-gray-900 dark:text-white font-mono">
                                  {agent.forkDetails.fork_id}
                                </code>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Queries:</span>
                                <span className="text-gray-900 dark:text-white font-semibold">
                                  {agent.forkDetails.queries_executed}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Patterns Matched:</span>
                                <span className="text-gray-900 dark:text-white font-semibold">
                                  {agent.forkDetails.patterns_matched}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Execution Time:</span>
                                <span className="text-gray-900 dark:text-white font-semibold">
                                  {agent.forkDetails.execution_time_ms}ms
                                </span>
                              </div>
                              
                              {agent.forkDetails.similar_patterns.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                                  <div className="font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Similar Patterns Found:
                                  </div>
                                  {agent.forkDetails.similar_patterns.map((pattern, idx) => (
                                    <div key={idx} className="flex items-center justify-between py-1">
                                      <span className="text-gray-600 dark:text-gray-400 text-xs">
                                        {pattern.pattern}
                                      </span>
                                      <span className="text-blue-600 dark:text-blue-400 font-semibold">
                                        {(pattern.similarity * 100).toFixed(0)}%
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Info Panel */}
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg shadow-lg p-6 border border-blue-200 dark:border-blue-800">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Powered by Tiger Cloud
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Each agent runs in an isolated database fork for parallel analysis using
                    Agentic Postgres and pgvector for pattern matching.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
