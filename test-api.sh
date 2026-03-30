#!/bin/bash
# =============================================
#  test-api.sh — Test backend API endpoints
#  Usage: ./test-api.sh [token]
# =============================================

set -e

API_BASE="http://localhost:3001"
TOKEN=""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  Icon Library API Testing${NC}"
echo -e "${BLUE}================================================${NC}\n"

# Check if token provided as argument or in .test-token file
if [ -n "$1" ]; then
  TOKEN="$1"
  echo -e "${GREEN}✓${NC} Using token from command line argument"
elif [ -f ".test-token" ]; then
  TOKEN=$(cat .test-token)
  echo -e "${GREEN}✓${NC} Using token from .test-token file"
else
  echo -e "${YELLOW}⚠${NC}  No token found. Run: node test-auth.js"
  echo -e "${YELLOW}⚠${NC}  Or provide token as argument: ./test-api.sh YOUR_TOKEN\n"
  echo -e "Testing without authentication (should return 401)...\n"
fi

# Test function
test_endpoint() {
  local method="$1"
  local endpoint="$2"
  local description="$3"
  local data="$4"

  echo -e "${BLUE}Test:${NC} ${description}"
  echo -e "${BLUE}→${NC} ${method} ${endpoint}"

  if [ -z "$TOKEN" ]; then
    # Test without auth - should get 401
    response=$(curl -s -w "\n%{http_code}" -X "$method" "${API_BASE}${endpoint}" \
      -H "Content-Type: application/json" \
      ${data:+-d "$data"})
  else
    # Test with auth
    response=$(curl -s -w "\n%{http_code}" -X "$method" "${API_BASE}${endpoint}" \
      -H "Authorization: Bearer ${TOKEN}" \
      -H "Content-Type: application/json" \
      ${data:+-d "$data"})
  fi

  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')

  if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
    echo -e "${GREEN}✓${NC} Status: ${http_code}"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
  elif [ "$http_code" = "401" ]; then
    echo -e "${YELLOW}⚠${NC} Status: ${http_code} (Unauthorized - expected without token)"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
  else
    echo -e "${RED}✗${NC} Status: ${http_code}"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
  fi

  echo ""
}

# Test 1: GET /api/icons
echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Test 1: List all icons${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
test_endpoint "GET" "/api/icons" "Fetch all icons for authenticated tenant"

# Test 2: GET /api/icons/:id (we'll try a common ID)
if [ -n "$TOKEN" ]; then
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}Test 2: Get specific icon${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

  # First get an icon ID from the list
  FIRST_ICON_ID=$(curl -s -X GET "${API_BASE}/api/icons" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" | jq -r '.[0].id // empty')

  if [ -n "$FIRST_ICON_ID" ]; then
    test_endpoint "GET" "/api/icons/${FIRST_ICON_ID}" "Fetch icon with ID: ${FIRST_ICON_ID}"
  else
    echo -e "${YELLOW}⚠${NC} No icons found in database to test GET by ID\n"
  fi
fi

# Test 3: POST /api/icons (create new icon)
if [ -n "$TOKEN" ]; then
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}Test 3: Create new icon${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

  TIMESTAMP=$(date +%s)
  NEW_ICON_DATA=$(cat <<EOF
{
  "id": "test-icon-${TIMESTAMP}",
  "name": "Test Icon ${TIMESTAMP}",
  "category": "Test",
  "svg": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\"><circle cx=\"12\" cy=\"12\" r=\"10\" stroke-width=\"2\"/><path d=\"M12 6v6l4 2\" stroke-width=\"2\" stroke-linecap=\"round\"/></svg>"
}
EOF
)
  test_endpoint "POST" "/api/icons" "Create new test icon" "$NEW_ICON_DATA"
fi

# Test 4: Invalid token (should return 401)
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Test 4: Invalid token${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo -e "${BLUE}Test:${NC} Request with invalid token (should return 401)"
echo -e "${BLUE}→${NC} GET /api/icons"

response=$(curl -s -w "\n%{http_code}" -X GET "${API_BASE}/api/icons" \
  -H "Authorization: Bearer invalid.token.here" \
  -H "Content-Type: application/json")

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" = "401" ]; then
  echo -e "${GREEN}✓${NC} Status: ${http_code} (Correctly rejected invalid token)"
  echo "$body" | jq '.' 2>/dev/null || echo "$body"
else
  echo -e "${RED}✗${NC} Status: ${http_code} (Should have returned 401)"
  echo "$body" | jq '.' 2>/dev/null || echo "$body"
fi

echo ""
echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  Testing Complete${NC}"
echo -e "${BLUE}================================================${NC}\n"

if [ -z "$TOKEN" ]; then
  echo -e "${YELLOW}💡 Tip:${NC} Run 'node test-auth.js' to get a valid token"
  echo -e "${YELLOW}💡 Tip:${NC} Then run './test-api.sh' to test with authentication\n"
fi
