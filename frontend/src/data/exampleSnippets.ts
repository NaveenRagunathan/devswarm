/**
 * Example Code Snippets
 * 
 * Provides example code for each language that:
 * - Runs successfully
 * - Triggers multiple agent findings
 * - Demonstrates various code issues
 */

export interface CodeExample {
  name: string;
  description: string;
  code: string;
  language: 'javascript' | 'python' | 'typescript';
}

export const EXAMPLE_SNIPPETS: Record<string, CodeExample[]> = {
  javascript: [
    {
      name: 'Vulnerable Login Function',
      description: 'Security, performance, and best practice issues',
      language: 'javascript',
      code: `function login(username, password) {
  // Security issue: eval is dangerous
  const user = eval('({name: "' + username + '"})');
  
  // Best practice issue: console.log in production
  console.log('Login attempt:', password);
  
  // Accessibility issue: no null check
  const msgElement = document.getElementById('msg');
  msgElement.innerHTML = 'Welcome ' + user.name;
  
  // Performance issue: missing error handling
  return user;
}

// Test the function
const result = login('admin', 'secret123');
console.log('Login result:', result);`,
    },
    {
      name: 'Async/Await with Issues',
      description: 'Missing error handling and unhandled promises',
      language: 'javascript',
      code: `async function fetchUserData(userId) {
  // Performance issue: no timeout
  const response = await fetch('https://api.example.com/users/' + userId);
  const data = await response.json();
  
  // Best practice issue: no error handling
  console.log(data);
  return data;
}

async function processUsers() {
  const users = [1, 2, 3, 4, 5];
  
  // Performance issue: sequential instead of parallel
  for (let i = 0; i < users.length; i++) {
    console.log('Processing user', users[i]);
    await fetchUserData(users[i]);
  }
  
  console.log('All users processed');
}

// Run the function
processUsers();
console.log('Started processing...');`,
    },
    {
      name: 'DOM Manipulation Problems',
      description: 'Accessibility and security issues',
      language: 'javascript',
      code: `function updateUserProfile(userData) {
  // Accessibility issue: no ARIA labels
  const container = document.createElement('div');
  
  // Security issue: XSS vulnerability
  container.innerHTML = '<h1>' + userData.name + '</h1>';
  
  // Accessibility issue: missing alt text
  const img = document.createElement('img');
  img.src = userData.avatar;
  container.appendChild(img);
  
  // Performance issue: forced reflow
  document.body.appendChild(container);
  const height = container.offsetHeight;
  console.log('Container height:', height);
  
  // Best practice issue: magic number
  setTimeout(() => {
    container.style.opacity = '1';
  }, 300);
}

// Test the function
updateUserProfile({ name: 'John Doe', avatar: 'avatar.jpg' });
console.log('Profile updated');`,
    },
  ],

  python: [
    {
      name: 'Insecure API Handler',
      description: 'SQL injection and input validation issues',
      language: 'python',
      code: `def get_user_by_id(user_id):
    # Security issue: SQL injection vulnerable
    query = "SELECT * FROM users WHERE id = " + user_id
    
    # Best practice issue: no input validation
    print(f"Executing query: {query}")
    
    # Performance issue: missing connection pooling
    # Simulating database query
    result = {"id": user_id, "name": "User"}
    return result

def process_user_request(request_data):
    # Security issue: no input sanitization
    user_id = request_data.get('user_id')
    
    # Best practice issue: no error handling
    user = get_user_by_id(user_id)
    
    # Performance issue: console.log equivalent
    print(f"Found user: {user}")
    
    return user

# Test the function
request = {'user_id': '1 OR 1=1'}
result = process_user_request(request)
print(f"Result: {result}")`,
    },
    {
      name: 'Performance Issues',
      description: 'Inefficient loops and string operations',
      language: 'python',
      code: `def process_data(items):
    result = ""
    
    # Performance issue: string concatenation in loop
    for i in range(len(items)):
        result += str(items[i]) + ", "
        print(f"Processing item {i}")
    
    # Performance issue: inefficient list operations
    filtered = []
    for item in items:
        if item > 0:
            filtered.append(item)
    
    # Best practice issue: variable naming
    x = 0
    for i in filtered:
        x += i
    
    print(f"Total: {x}")
    return result

# Test the function
data = list(range(-10, 100))
output = process_data(data)
print(f"Output length: {len(output)}")`,
    },
    {
      name: 'Poor Error Handling',
      description: 'Bare except and silent failures',
      language: 'python',
      code: `def read_config_file(filename):
    try:
        # Best practice issue: bare except
        with open(filename, 'r') as f:
            data = f.read()
        return data
    except:
        # Best practice issue: silent failure
        pass
    
    return None

def parse_config(config_str):
    # Security issue: eval usage
    try:
        config = eval(config_str)
        return config
    except:
        # Best practice issue: no error logging
        return {}

# Test the functions
config_data = read_config_file('config.txt')
if config_data:
    parsed = parse_config(config_data)
    print(f"Config loaded: {parsed}")
else:
    print("Failed to load config")`,
    },
  ],

  typescript: [
    {
      name: 'Type Unsafe Code',
      description: 'Any types and missing type safety',
      language: 'typescript',
      code: `// Best practice issue: any type
function processData(data: any): any {
  // Best practice issue: type assertion without check
  const user = data as { name: string; age: number };
  
  // Performance issue: console.log
  console.log('Processing user:', user.name);
  
  // Best practice issue: no null check
  return user.name.toUpperCase();
}

// Best practice issue: implicit any
function fetchData(url) {
  // Performance issue: no error handling
  return fetch(url).then(res => res.json());
}

// Security issue: eval usage
function evaluateExpression(expr: string): number {
  return eval(expr);
}

// Test the functions
const result = processData({ name: 'John', age: 30 });
console.log('Result:', result);

const value = evaluateExpression('2 + 2');
console.log('Evaluated:', value);`,
    },
    {
      name: 'React Component Issues',
      description: 'Hook dependencies and prop validation',
      language: 'typescript',
      code: `import { useState, useEffect } from 'react';

// Best practice issue: missing prop types
function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Best practice issue: missing dependency
  useEffect(() => {
    setLoading(true);
    fetchUser(userId).then(data => {
      setUser(data);
      setLoading(false);
    });
  }, []); // Missing userId dependency
  
  // Accessibility issue: no loading state
  // Security issue: dangerouslySetInnerHTML
  return (
    <div dangerouslySetInnerHTML={{ __html: user?.bio }} />
  );
}

async function fetchUser(id: any) {
  // Performance issue: no caching
  console.log('Fetching user:', id);
  return { id, name: 'User', bio: '<p>Bio</p>' };
}

// Test
console.log('Component defined');`,
    },
    {
      name: 'API Client Problems',
      description: 'Missing error boundaries and types',
      language: 'typescript',
      code: `// Best practice issue: no interface
class ApiClient {
  private baseUrl: any; // Type issue
  
  constructor(url: string) {
    this.baseUrl = url;
  }
  
  // Best practice issue: no error handling
  async get(endpoint: string) {
    const response = await fetch(this.baseUrl + endpoint);
    return response.json();
  }
  
  // Performance issue: no request caching
  async post(endpoint: string, data: any) {
    console.log('Posting to:', endpoint);
    
    const response = await fetch(this.baseUrl + endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    
    return response.json();
  }
}

// Test the client
const client = new ApiClient('https://api.example.com');
client.get('/users').then(users => {
  console.log('Users:', users);
});`,
    },
  ],
};

// Get examples for a specific language
export function getExamplesForLanguage(language: string): CodeExample[] {
  return EXAMPLE_SNIPPETS[language] || [];
}

// Get all languages with examples
export function getAvailableLanguages(): string[] {
  return Object.keys(EXAMPLE_SNIPPETS);
}
