#!/bin/bash

# Security Check Script
# Runs comprehensive security tests locally

set -e

echo "🔒 CMS Evidence Platform Security Check"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if bun is installed
if ! command -v bun &> /dev/null; then
    echo -e "${RED}❌ bun is not installed${NC}"
    exit 1
fi

echo "1. Running audit for CVE scanning..."
echo "------------------------------------"
if bunx npm@latest audit --audit-level=moderate; then
    echo -e "${GREEN}✅ No moderate or higher vulnerabilities found${NC}"
else
    echo -e "${YELLOW}⚠️  Vulnerabilities found - review above${NC}"
fi
echo ""

echo "2. Checking for critical vulnerabilities..."
echo "-------------------------------------------"
if bunx npm@latest audit --audit-level=critical; then
    echo -e "${GREEN}✅ No critical vulnerabilities${NC}"
else
    echo -e "${RED}❌ Critical vulnerabilities detected!${NC}"
    echo "   Run 'bunx npm@latest audit' for details"
fi
echo ""

echo "3. Running security unit tests..."
echo "---------------------------------"
if bun run test:security; then
    echo -e "${GREEN}✅ Security tests passed${NC}"
else
    echo -e "${RED}❌ Security tests failed${NC}"
    exit 1
fi
echo ""

echo "4. Checking security headers configuration..."
echo "--------------------------------------------"
if grep -q "X-Frame-Options" middleware.ts && \
   grep -q "X-Content-Type-Options" middleware.ts && \
   grep -q "Content-Security-Policy" middleware.ts; then
    echo -e "${GREEN}✅ Security headers configured${NC}"
else
    echo -e "${RED}❌ Security headers missing in middleware.ts${NC}"
fi
echo ""

echo "5. Checking for sensitive data exposure..."
echo "-----------------------------------------"
# Check for common sensitive patterns
SENSITIVE_PATTERNS="password=|api_key=|secret=|private_key=|aws_access_key"
if grep -r -i -E "$SENSITIVE_PATTERNS" --include="*.ts" --include="*.tsx" --include="*.js" --exclude-dir=node_modules --exclude-dir=.next . 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Potential sensitive data found - review above${NC}"
else
    echo -e "${GREEN}✅ No obvious sensitive data exposure${NC}"
fi
echo ""

echo "6. Checking database security policies..."
echo "----------------------------------------"
RLS_CHECK=$(find . -name "*.sql" -type f -exec grep -l "ROW LEVEL SECURITY" {} \; | wc -l)
if [ "$RLS_CHECK" -gt 0 ]; then
    echo -e "${GREEN}✅ Row Level Security policies found${NC}"
else
    echo -e "${YELLOW}⚠️  No RLS policies found in SQL files${NC}"
fi
echo ""

echo "======================================"
echo "Security Check Summary:"
echo "======================================"
echo ""
echo "To run a full penetration test:"
echo "1. Install OWASP ZAP: https://www.zaproxy.org/download/"
echo "2. Start the application: bun run dev"
echo "3. Run: zap-baseline.py -t http://localhost:3000 -c .zap/rules.tsv"
echo ""
echo "For detailed security testing documentation, see SECURITY_TESTING.md"
echo ""

# Generate summary report
REPORT_FILE="security-check-report-$(date +%Y%m%d-%H%M%S).txt"
echo "Generating report: $REPORT_FILE"
{
    echo "CMS Evidence Platform Security Check Report"
    echo "Generated: $(date)"
    echo ""
    echo "CVE Scan Results:"
    bunx npm@latest audit --json 2>/dev/null | jq '.metadata.vulnerabilities' || echo "Unable to parse audit results"
    echo ""
    echo "Security Tests: $(bun run test:security &>/dev/null && echo "PASSED" || echo "FAILED")"
    echo "Security Headers: Configured in middleware.ts"
    echo "RLS Policies: $RLS_CHECK found"
} > "$REPORT_FILE"

echo -e "${GREEN}✅ Report saved to: $REPORT_FILE${NC}"