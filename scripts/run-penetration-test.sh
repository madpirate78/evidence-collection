#!/bin/bash

# Run OWASP ZAP Penetration Test and Generate Report
# This script runs penetration tests against LOCAL development environment
#
# NOTE: Railway production testing is NOT supported due to:
# - Docker-in-Docker limitations on Railway
# - IPv6-only networking restrictions
# - Infrastructure complexity

set -e

echo "🔒 CMS Evidence Platform - Local Penetration Testing"
echo "===================================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration - LOCAL TESTING ONLY
TARGET_URL="${1:-http://localhost:3000}"
REPORT_DIR="security/reports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_NAME="pentest_report_${TIMESTAMP}"

# Create reports directory
mkdir -p "$REPORT_DIR"

echo -e "${BLUE}🏠 LOCAL TESTING MODE${NC}"
echo "Target: $TARGET_URL"
echo "Cost: Free"
echo "Requirements: Local environment must be running"
echo ""

# Validate target is localhost
if [[ "$TARGET_URL" != "http://localhost:3000" ]] && [[ "$TARGET_URL" != "http://127.0.0.1:3000" ]]; then
    echo -e "${RED}❌ Only localhost testing is supported${NC}"
    echo ""
    echo "Supported targets:"
    echo "  - http://localhost:3000 (default)"
    echo "  - http://127.0.0.1:3000"
    echo ""
    echo "Railway production testing is not supported due to:"
    echo "  - Docker-in-Docker limitations"
    echo "  - IPv6-only networking restrictions"
    exit 1
fi

echo "To start local environment if not running:"
echo "  1. ./scripts/start-test-env.sh development"
echo "  2. bun run dev (in another terminal)"
echo ""

# Check if local server is running
if ! curl -s "$TARGET_URL" > /dev/null; then
    echo -e "${RED}❌ Local server not running at $TARGET_URL${NC}"
    echo "Start with: bun run dev"
    exit 1
fi

echo -e "${GREEN}✅ Local server is running at $TARGET_URL${NC}"
echo ""

# Check if OWASP ZAP is available
if ! command -v zaproxy &> /dev/null && ! command -v zap.sh &> /dev/null; then
    echo -e "${YELLOW}OWASP ZAP not found. Installing via Docker...${NC}"
    USING_DOCKER=true
else
    USING_DOCKER=false
fi

echo ""
echo "Starting penetration test..."
echo "============================"

# Run different types of scans
if [ "$USING_DOCKER" = true ]; then
    echo -e "${YELLOW}Running OWASP ZAP via Docker...${NC}"

    # Quick scan first
    echo "1. Running quick scan..."
    docker run --rm --network host -v $(pwd):/zap/wrk:rw -t zaproxy/zap-stable zap-baseline.py \
        -t "$TARGET_URL" \
        -r "${REPORT_DIR}/${REPORT_NAME}_quick.html" \
        -w "${REPORT_DIR}/${REPORT_NAME}_quick.md" \
        -J "${REPORT_DIR}/${REPORT_NAME}_quick.json" \
        -c security/zap-config.conf || true

    echo ""
    echo "2. Running full scan (this may take 10-20 minutes)..."
    docker run --rm --network host -v $(pwd):/zap/wrk:rw -t zaproxy/zap-stable zap-full-scan.py \
        -t "$TARGET_URL" \
        -r "${REPORT_DIR}/${REPORT_NAME}_full.html" \
        -w "${REPORT_DIR}/${REPORT_NAME}_full.md" \
        -J "${REPORT_DIR}/${REPORT_NAME}_full.json" \
        -c security/zap-config.conf \
        -a -j || true
else
    echo -e "${YELLOW}Running local OWASP ZAP...${NC}"
    # Use local ZAP installation
    zap.sh -cmd -quickurl "$TARGET_URL" -quickout "${REPORT_DIR}/${REPORT_NAME}_quick.html" || true
fi

echo ""
echo "3. Running additional security checks..."

# Run dependency audit
echo "   - Dependency audit..."
bunx npm@latest audit --json > "${REPORT_DIR}/${REPORT_NAME}_npm_audit.json" || true

# Check security headers
echo "   - Security headers check..."
curl -s -I "$TARGET_URL" > "${REPORT_DIR}/${REPORT_NAME}_headers.txt"

# Test rate limiting
echo "   - Rate limiting test..."
echo "Rate Limiting Test Results" > "${REPORT_DIR}/${REPORT_NAME}_rate_limit.txt"
echo "==========================" >> "${REPORT_DIR}/${REPORT_NAME}_rate_limit.txt"
echo "" >> "${REPORT_DIR}/${REPORT_NAME}_rate_limit.txt"

# Test 1: Rapid requests to form submission endpoint (server action)
# The real rate limiter (1 attempt per 3 days) protects the statement-portal form
echo "Test 1: Form submission rate limiter (POST to /statement-portal)" >> "${REPORT_DIR}/${REPORT_NAME}_rate_limit.txt"
echo "Expected: 1st request allowed, 2nd request blocked within 3-day window" >> "${REPORT_DIR}/${REPORT_NAME}_rate_limit.txt"
for i in {1..3}; do
    echo "  Request $i:" >> "${REPORT_DIR}/${REPORT_NAME}_rate_limit.txt"
    response=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$TARGET_URL/statement-portal" \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -H "X-Forwarded-For: 10.255.255.${i}" 2>&1)
    http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d: -f2)
    echo "    Status: $http_code" >> "${REPORT_DIR}/${REPORT_NAME}_rate_limit.txt"
    sleep 0.2
done
echo "" >> "${REPORT_DIR}/${REPORT_NAME}_rate_limit.txt"

# Test 2: Rapid requests to health endpoint (availability check)
echo "Test 2: Health endpoint under load (10 rapid requests)" >> "${REPORT_DIR}/${REPORT_NAME}_rate_limit.txt"
echo "Expected: All 200 unless server is under stress" >> "${REPORT_DIR}/${REPORT_NAME}_rate_limit.txt"
for i in {1..10}; do
    echo "  Request $i:" >> "${REPORT_DIR}/${REPORT_NAME}_rate_limit.txt"
    curl -s -o /dev/null -w "    Status: %{http_code}\n" -X GET "$TARGET_URL/api/health" >> "${REPORT_DIR}/${REPORT_NAME}_rate_limit.txt"
done
echo "" >> "${REPORT_DIR}/${REPORT_NAME}_rate_limit.txt"

# Test 3: Check security headers are present on responses
echo "Test 3: Security headers on rate-limited responses" >> "${REPORT_DIR}/${REPORT_NAME}_rate_limit.txt"
curl -s -I "$TARGET_URL/statement-portal" | grep -iE "^(x-content-type|x-frame|content-security|strict-transport|referrer-policy|x-xss)" >> "${REPORT_DIR}/${REPORT_NAME}_rate_limit.txt" 2>/dev/null || echo "  No security headers found on response" >> "${REPORT_DIR}/${REPORT_NAME}_rate_limit.txt"

echo ""
echo "Generating concise report..."
echo "============================"

# Create concise consolidated report
cat > "${REPORT_DIR}/${REPORT_NAME}_report.md" << EOF
# Security Test Report
**Date**: $(date '+%Y-%m-%d %H:%M')
**Target**: $TARGET_URL
**Type**: Local OWASP ZAP Scan

## Results Summary
EOF

# Generate concise summary
if [ -f "${REPORT_DIR}/${REPORT_NAME}_npm_audit.json" ]; then
    npm_vulns=$(cat "${REPORT_DIR}/${REPORT_NAME}_npm_audit.json" | jq -r '.metadata.vulnerabilities.total // 0')
else
    npm_vulns="0"
fi

# Count and validate security headers
security_headers=$(grep -iE "^(Content-Security-Policy|X-Frame-Options|X-Content-Type-Options|Strict-Transport-Security|Referrer-Policy)" "${REPORT_DIR}/${REPORT_NAME}_headers.txt" 2>/dev/null | wc -l)
header_details=""
if grep -qi "X-Content-Type-Options: nosniff" "${REPORT_DIR}/${REPORT_NAME}_headers.txt" 2>/dev/null; then
    header_details="${header_details}\n- X-Content-Type-Options: nosniff ✅"
else
    header_details="${header_details}\n- X-Content-Type-Options: MISSING ❌"
fi
if grep -qi "X-Frame-Options" "${REPORT_DIR}/${REPORT_NAME}_headers.txt" 2>/dev/null; then
    header_details="${header_details}\n- X-Frame-Options: $(grep -i 'X-Frame-Options' "${REPORT_DIR}/${REPORT_NAME}_headers.txt" | head -1 | cut -d: -f2 | xargs) ✅"
else
    header_details="${header_details}\n- X-Frame-Options: MISSING ❌"
fi
if grep -qi "Content-Security-Policy" "${REPORT_DIR}/${REPORT_NAME}_headers.txt" 2>/dev/null; then
    csp_val=$(grep -i 'Content-Security-Policy' "${REPORT_DIR}/${REPORT_NAME}_headers.txt" | head -1)
    if echo "$csp_val" | grep -q "unsafe-eval"; then
        header_details="${header_details}\n- CSP: SET ⚠️  (contains unsafe-eval)"
    else
        header_details="${header_details}\n- CSP: SET ✅"
    fi
else
    header_details="${header_details}\n- CSP: MISSING ❌"
fi
if grep -qi "Strict-Transport-Security" "${REPORT_DIR}/${REPORT_NAME}_headers.txt" 2>/dev/null; then
    header_details="${header_details}\n- HSTS: SET ✅"
else
    header_details="${header_details}\n- HSTS: NOT SET (expected in production only) ℹ️"
fi
if grep -qi "Referrer-Policy" "${REPORT_DIR}/${REPORT_NAME}_headers.txt" 2>/dev/null; then
    header_details="${header_details}\n- Referrer-Policy: $(grep -i 'Referrer-Policy' "${REPORT_DIR}/${REPORT_NAME}_headers.txt" | head -1 | cut -d: -f2 | xargs) ✅"
else
    header_details="${header_details}\n- Referrer-Policy: MISSING ❌"
fi

# Get rate limiting result
rate_limit_codes=$(grep "Status:" "${REPORT_DIR}/${REPORT_NAME}_rate_limit.txt" | grep -o '[0-9][0-9][0-9]' | sort | uniq -c)

cat >> "${REPORT_DIR}/${REPORT_NAME}_report.md" << EOF

### 🔍 OWASP ZAP Scan
$(if [ -f "${REPORT_DIR}/${REPORT_NAME}_quick.md" ]; then
    grep -E "High|Medium|Low|Informational" "${REPORT_DIR}/${REPORT_NAME}_quick.md" | head -4 | sed 's/^/- /'
else
    echo "- ⚠️  ZAP scan failed - check Docker/ZAP installation"
fi)

### 📦 Dependencies
- **CVE Vulnerabilities**: $npm_vulns

### 🛡️  Security Headers ($security_headers/5 expected)
$(echo -e "$header_details")

### ⏱️  Rate Limiting
$rate_limit_codes

### ✅ Status
$(if [ "$npm_vulns" = "0" ] && [ "$security_headers" -ge "4" ]; then
    echo "**PASS** - No critical issues found"
elif [ "$npm_vulns" = "0" ] && [ "$security_headers" -ge "3" ]; then
    echo "**PASS (local)** - Core headers present (HSTS only in production)"
else
    echo "**REVIEW** - Issues require attention"
fi)

---
*Generated: $(date '+%H:%M %d/%m/%y')*
EOF

echo ""
echo -e "${GREEN}✅ Local penetration test complete!${NC}"
echo ""
echo "📄 Main Report: ${REPORT_DIR}/${REPORT_NAME}_report.md"
echo ""
echo "📁 Detailed Files:"
if [ -f "${REPORT_DIR}/${REPORT_NAME}_quick.html" ]; then
    echo "  - ZAP HTML: ${REPORT_NAME}_quick.html"
fi
if [ -f "${REPORT_DIR}/${REPORT_NAME}_quick.json" ]; then
    echo "  - ZAP JSON: ${REPORT_NAME}_quick.json"
fi
echo "  - NPM Audit: ${REPORT_NAME}_npm_audit.json"
echo "  - Headers: ${REPORT_NAME}_headers.txt"
echo "  - Rate Limit: ${REPORT_NAME}_rate_limit.txt"
echo ""
echo -e "${BLUE}💡 View report: cat ${REPORT_DIR}/${REPORT_NAME}_report.md${NC}"