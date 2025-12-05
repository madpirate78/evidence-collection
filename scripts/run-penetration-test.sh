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
echo "  2. npm run dev (in another terminal)"
echo ""

# Check if local server is running
if ! curl -s "$TARGET_URL" > /dev/null; then
    echo -e "${RED}❌ Local server not running at $TARGET_URL${NC}"
    echo "Start with: npm run dev"
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

# Run npm audit
echo "   - NPM dependency audit..."
npm audit --json > "${REPORT_DIR}/${REPORT_NAME}_npm_audit.json" || true

# Check security headers
echo "   - Security headers check..."
curl -s -I "$TARGET_URL" > "${REPORT_DIR}/${REPORT_NAME}_headers.txt"

# Test rate limiting
echo "   - Rate limiting test..."
echo "Testing rate limiting (6 rapid requests to health endpoint)..." > "${REPORT_DIR}/${REPORT_NAME}_rate_limit.txt"
for i in {1..6}; do
    echo "Request $i:" >> "${REPORT_DIR}/${REPORT_NAME}_rate_limit.txt"
    curl -s -o /dev/null -w "%{http_code}\n" -X GET "$TARGET_URL/api/health" >> "${REPORT_DIR}/${REPORT_NAME}_rate_limit.txt"
    sleep 0.1
done

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

# Count security headers
security_headers=$(grep -E "^(Content-Security-Policy|X-Frame-Options|X-Content-Type-Options|Strict-Transport-Security)" "${REPORT_DIR}/${REPORT_NAME}_headers.txt" 2>/dev/null | wc -l)

# Get rate limiting result
rate_limit_codes=$(tail -6 "${REPORT_DIR}/${REPORT_NAME}_rate_limit.txt" | grep -o '[0-9][0-9][0-9]' | sort | uniq -c)

cat >> "${REPORT_DIR}/${REPORT_NAME}_report.md" << EOF

### 🔍 OWASP ZAP Scan
$(if [ -f "${REPORT_DIR}/${REPORT_NAME}_quick.md" ]; then
    grep -E "High|Medium|Low|Informational" "${REPORT_DIR}/${REPORT_NAME}_quick.md" | head -4 | sed 's/^/- /'
else
    echo "- ⚠️  ZAP scan failed - check Docker/ZAP installation"
fi)

### 📦 Dependencies
- **CVE Vulnerabilities**: $npm_vulns

### 🛡️  Security Headers
- **Headers Found**: $security_headers/4 expected

### ⏱️  Rate Limiting
$rate_limit_codes

### ✅ Status
$(if [ "$npm_vulns" = "0" ] && [ "$security_headers" -ge "3" ]; then
    echo "**PASS** - No critical issues found"
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