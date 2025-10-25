# DevSwarm Build Rules

- Always use Tiger MCP for database operations
- Each agent runs in isolated fork
- All async operations need proper error handling
- Follow schema in database/schema.sql
- Use TypeScript strict mode
```

### **Smart Context Loading**
```
"Analyze the current codebase structure and identify what needs to be 
implemented next based on our CASCADE_CONTEXT.md goals."
```

### **Debugging Prompts**
```
"The fork creation is failing with [ERROR]. Check:
1. Tiger MCP connection
2. Fork permissions
3. SQL syntax
Debug and fix, showing the complete corrected code."
```

---

## 🎬 Your First Prompt (Copy This)
```
I'm building DevSwarm - a multi-agent code analysis platform using Tiger Data's 
Agentic Postgres for their DEV challenge. Check CASCADE_CONTEXT.md for full context.

Let's start with the foundation:

1. Create the Tiger database schema with:
   - agents table
   - code_submissions table  
   - analysis_results table
   - code_patterns table (with pgvector for embeddings)

2. Set up the project structure:
   - Backend: Node.js + TypeScript
   - Frontend: React + Vite + Tailwind
   - Proper tsconfig, package.json, etc.

3. Initialize Tiger MCP integration boilerplate

Give me complete, runnable code for these 3 items. No placeholders - 
I want to run this immediately after you're done.