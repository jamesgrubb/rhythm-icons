#!/bin/bash
# =============================================
#  check-deployment-readiness.sh
#  Verify the add-in is ready for external testing
# =============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  Deployment Readiness Check${NC}"
echo -e "${BLUE}================================================${NC}\n"

ERRORS=0
WARNINGS=0
CHECKS=0

# Function to check and display results
check() {
  local name="$1"
  local status="$2"
  local message="$3"
  local level="${4:-error}" # error or warning

  CHECKS=$((CHECKS + 1))

  if [ "$status" = "pass" ]; then
    echo -e "${GREEN}✓${NC} ${name}"
  elif [ "$level" = "warning" ]; then
    echo -e "${YELLOW}⚠${NC} ${name}"
    echo -e "  ${YELLOW}${message}${NC}"
    WARNINGS=$((WARNINGS + 1))
  else
    echo -e "${RED}✗${NC} ${name}"
    echo -e "  ${RED}${message}${NC}"
    ERRORS=$((ERRORS + 1))
  fi
}

echo -e "${BLUE}Checking manifest.xml...${NC}\n"

# Check if manifest exists
if [ ! -f "manifest.xml" ]; then
  check "Manifest file exists" "fail" "manifest.xml not found"
else
  check "Manifest file exists" "pass"

  # Check for localhost URLs
  if grep -q "localhost" manifest.xml; then
    check "No localhost URLs in manifest" "fail" "Found localhost URLs - update to production domain"
  else
    check "No localhost URLs in manifest" "pass"
  fi

  # Check for placeholder GUIDs
  if grep -q "YOUR-GUID-HERE" manifest.xml; then
    check "Manifest GUID updated" "fail" "Found placeholder GUID - generate unique GUID"
  else
    check "Manifest GUID updated" "pass"
  fi

  # Check for Azure client ID
  if grep -q "YOUR-AZURE-APP-CLIENT-ID" manifest.xml; then
    check "Azure Client ID configured" "fail" "Found placeholder Azure Client ID"
  else
    check "Azure Client ID configured" "pass"
  fi
fi

echo -e "\n${BLUE}Checking auth.js configuration...${NC}\n"

if [ ! -f "auth.js" ]; then
  check "auth.js exists" "fail" "auth.js not found"
else
  check "auth.js exists" "pass"

  # Check for Azure placeholders
  if grep -q "YOUR-AZURE-APP-CLIENT-ID" auth.js; then
    check "Auth config updated" "fail" "Found placeholder Azure credentials in auth.js"
  else
    check "Auth config updated" "pass"
  fi
fi

echo -e "\n${BLUE}Checking server.js configuration...${NC}\n"

if [ ! -f "server.js" ]; then
  check "server.js exists" "fail" "server.js not found"
else
  check "server.js exists" "pass"

  # Check for Azure placeholders
  if grep -q "YOUR-AZURE-APP-CLIENT-ID" server.js; then
    check "Server Azure config" "fail" "Found placeholder Azure credentials in server.js" "warning"
  else
    check "Server Azure config" "pass"
  fi

  # Check CORS configuration
  if grep -q "localhost:3000" server.js; then
    check "CORS includes localhost" "pass" "" "warning"
    echo -e "  ${YELLOW}Note: Update CORS to include production domain${NC}"
  fi
fi

echo -e "\n${BLUE}Checking environment configuration...${NC}\n"

if [ ! -f ".env" ]; then
  check ".env file exists" "fail" "No .env file found - copy from .env.example" "warning"
else
  check ".env file exists" "pass"

  # Check database URL
  if grep -q "DATABASE_URL=postgresql://" .env; then
    check "Database configured" "pass"
  else
    check "Database configured" "fail" "DATABASE_URL not set in .env" "warning"
  fi

  # Check Azure credentials
  if grep -q "AZURE_CLIENT_ID=" .env && ! grep -q "AZURE_CLIENT_ID=YOUR" .env; then
    check "Azure credentials in .env" "pass"
  else
    check "Azure credentials in .env" "fail" "Azure credentials not configured" "warning"
  fi

  # Check NODE_ENV
  NODE_ENV=$(grep "NODE_ENV=" .env | cut -d= -f2)
  if [ "$NODE_ENV" = "production" ]; then
    check "NODE_ENV set to production" "pass"
  else
    check "NODE_ENV" "pass" "" "warning"
    echo -e "  ${YELLOW}NODE_ENV is '${NODE_ENV}' - consider 'production' for deployment${NC}"
  fi
fi

echo -e "\n${BLUE}Checking dependencies...${NC}\n"

if [ ! -d "node_modules" ]; then
  check "Dependencies installed" "fail" "Run 'npm install'"
else
  check "Dependencies installed" "pass"
fi

echo -e "\n${BLUE}Checking build output...${NC}\n"

if [ ! -d "dist" ]; then
  check "Build output exists" "fail" "Run 'npm run build'" "warning"
else
  check "Build output exists" "pass"

  # Check if build is recent
  if [ "dist" -ot "auth.js" ] || [ "dist" -ot "icons.js" ] || [ "dist" -ot "taskpane.js" ]; then
    check "Build is up to date" "fail" "Source files changed - run 'npm run build'" "warning"
  else
    check "Build is up to date" "pass"
  fi
fi

echo -e "\n${BLUE}Checking database migrations...${NC}\n"

if [ -d "db/migrations" ]; then
  check "Migrations folder exists" "pass"
  MIGRATION_COUNT=$(ls -1 db/migrations/*.js 2>/dev/null | wc -l)
  echo -e "  Found ${MIGRATION_COUNT} migration files"
else
  check "Migrations folder exists" "fail" "No migrations folder found" "warning"
fi

echo -e "\n${BLUE}Checking Azure AD App Registration...${NC}\n"

echo -e "${YELLOW}Manual checks required:${NC}"
echo -e "  [ ] App Registration created in Azure Portal"
echo -e "  [ ] Redirect URIs configured (SPA type):"
echo -e "      - https://your-production-domain.com/taskpane.html"
echo -e "  [ ] Application ID URI: api://YOUR-CLIENT-ID"
echo -e "  [ ] Custom scope created: Icons.Read"
echo -e "  [ ] Supported account types set correctly"
echo -e "      - Single tenant: Your organization only"
echo -e "      - Multi-tenant: Any Azure AD directory"
echo -e ""

echo -e "\n${BLUE}Deployment checklist:${NC}\n"
echo -e "  [ ] Backend deployed and accessible"
echo -e "  [ ] Database accessible from backend"
echo -e "  [ ] Environment variables set on server"
echo -e "  [ ] HTTPS certificate configured"
echo -e "  [ ] CORS configured for production domain"
echo -e "  [ ] manifest.xml updated with production URLs"
echo -e "  [ ] Build artifacts uploaded to server"
echo -e ""

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  Results${NC}"
echo -e "${BLUE}================================================${NC}\n"

echo -e "Total checks: ${CHECKS}"
echo -e "${GREEN}Passed: $((CHECKS - ERRORS - WARNINGS))${NC}"

if [ $WARNINGS -gt 0 ]; then
  echo -e "${YELLOW}Warnings: ${WARNINGS}${NC}"
fi

if [ $ERRORS -gt 0 ]; then
  echo -e "${RED}Errors: ${ERRORS}${NC}"
  echo -e "\n${RED}⚠ Fix errors before deploying for external testing${NC}\n"
  exit 1
else
  if [ $WARNINGS -gt 0 ]; then
    echo -e "\n${YELLOW}⚠ Review warnings before deploying${NC}\n"
  else
    echo -e "\n${GREEN}✓ Ready for deployment!${NC}\n"
  fi
fi

echo -e "${BLUE}Next steps:${NC}"
echo -e "  1. Deploy backend to production server"
echo -e "  2. Update manifest.xml with production URLs"
echo -e "  3. Test authentication flow on production"
echo -e "  4. Share manifest.xml with test users"
echo -e "  5. Send TESTER-INSTRUCTIONS.md to test users\n"
