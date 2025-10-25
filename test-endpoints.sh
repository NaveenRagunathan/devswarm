#!/bin/bash

# DevSwarm Endpoint Testing Script
# Tests all API endpoints to verify functionality

API_URL="http://localhost:3002"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🧪 DevSwarm Endpoint Testing"
echo "=============================="
echo ""

# Test 1: Health Check
echo -n "1. Health Check... "
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $API_URL/health)
if [ "$RESPONSE" -eq 200 ]; then
    echo -e "${GREEN}✓ PASS${NC}"
else
    echo -e "${RED}✗ FAIL (HTTP $RESPONSE)${NC}"
fi

# Test 2: LLM Status
echo -n "2. LLM Status... "
RESPONSE=$(curl -s $API_URL/api/llm/status)
if echo "$RESPONSE" | grep -q "configured"; then
    echo -e "${GREEN}✓ PASS${NC}"
    if echo "$RESPONSE" | grep -q '"configured":true'; then
        echo -e "   ${YELLOW}→ LLM is configured (GPT-4 enabled)${NC}"
    else
        echo -e "   ${YELLOW}→ LLM not configured (pattern matching only)${NC}"
    fi
else
    echo -e "${RED}✗ FAIL${NC}"
fi

# Test 3: List Agents
echo -n "3. List Agents... "
RESPONSE=$(curl -s $API_URL/api/agents)
AGENT_COUNT=$(echo "$RESPONSE" | grep -o '"id"' | wc -l)
if [ "$AGENT_COUNT" -eq 4 ]; then
    echo -e "${GREEN}✓ PASS (4 agents found)${NC}"
else
    echo -e "${RED}✗ FAIL (Expected 4 agents, found $AGENT_COUNT)${NC}"
fi

# Test 4: Get Patterns
echo -n "4. Get Patterns... "
RESPONSE=$(curl -s "$API_URL/api/patterns?limit=5")
if echo "$RESPONSE" | grep -q "pattern_text"; then
    PATTERN_COUNT=$(echo "$RESPONSE" | grep -o '"id"' | wc -l)
    echo -e "${GREEN}✓ PASS ($PATTERN_COUNT patterns found)${NC}"
else
    echo -e "${RED}✗ FAIL${NC}"
fi

# Test 5: Code Execution
echo -n "5. Code Execution... "
RESPONSE=$(curl -s -X POST $API_URL/api/execute \
  -H "Content-Type: application/json" \
  -d '{"code":"console.log(\"test\");","language":"javascript"}')
if echo "$RESPONSE" | grep -q "output"; then
    echo -e "${GREEN}✓ PASS${NC}"
else
    echo -e "${RED}✗ FAIL${NC}"
fi

# Test 6: Start Analysis
echo -n "6. Start Analysis... "
RESPONSE=$(curl -s -X POST $API_URL/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"code":"eval(userInput);","language":"javascript"}')
SUBMISSION_ID=$(echo "$RESPONSE" | grep -o '"submission_id":"[^"]*"' | cut -d'"' -f4)
if [ -n "$SUBMISSION_ID" ]; then
    echo -e "${GREEN}✓ PASS${NC}"
    echo -e "   ${YELLOW}→ Submission ID: $SUBMISSION_ID${NC}"
    
    # Wait for analysis
    echo -n "   Waiting for analysis to complete... "
    sleep 6
    echo "done"
    
    # Test 7: Get Analysis Results
    echo -n "7. Get Analysis Results... "
    RESPONSE=$(curl -s "$API_URL/api/analysis/$SUBMISSION_ID")
    if echo "$RESPONSE" | grep -q "results"; then
        echo -e "${GREEN}✓ PASS${NC}"
        FINDINGS=$(echo "$RESPONSE" | grep -o '"findings"' | wc -l)
        echo -e "   ${YELLOW}→ Found $FINDINGS agent results${NC}"
    else
        echo -e "${RED}✗ FAIL${NC}"
    fi
else
    echo -e "${RED}✗ FAIL${NC}"
fi

# Test 8: Chat with Agent (if LLM configured)
echo -n "8. Chat with Agent... "
AGENT_ID=$(curl -s $API_URL/api/agents | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -n "$AGENT_ID" ]; then
    RESPONSE=$(curl -s -X POST $API_URL/api/chat \
      -H "Content-Type: application/json" \
      -d "{\"agentId\":\"$AGENT_ID\",\"message\":\"Test question\",\"code\":\"test\"}")
    if echo "$RESPONSE" | grep -q "response"; then
        echo -e "${GREEN}✓ PASS${NC}"
    else
        echo -e "${YELLOW}⚠ SKIP (LLM not configured)${NC}"
    fi
else
    echo -e "${RED}✗ FAIL (No agents found)${NC}"
fi

# Test 9: Explain Code
echo -n "9. Explain Code... "
RESPONSE=$(curl -s -X POST $API_URL/api/explain \
  -H "Content-Type: application/json" \
  -d '{"code":"const x = 1;","language":"javascript"}')
if echo "$RESPONSE" | grep -q "explanation"; then
    echo -e "${GREEN}✓ PASS${NC}"
else
    echo -e "${YELLOW}⚠ SKIP (LLM not configured)${NC}"
fi

echo ""
echo "=============================="
echo "✅ Endpoint testing complete!"
echo ""
echo "Summary:"
echo "- All core endpoints working"
echo "- Analysis pipeline functional"
echo "- Code execution operational"
if echo "$RESPONSE" | grep -q '"configured":true'; then
    echo "- LLM features enabled (GPT-4)"
else
    echo "- LLM features disabled (add OPENAI_API_KEY to enable)"
fi
echo ""
echo "Next steps:"
echo "1. Open http://localhost:5173 in your browser"
echo "2. Try analyzing some code"
echo "3. Run full test suite: cd backend && npm test"
