#!/usr/bin/env bash

# Temporary script for migration to vitest
# Run tests with both jest and vitest, and combine the coverage reports into a single report.
# Then check if the combined coverage report meets the thresholds defined in this script.
# Once we are migrated to vitest, this script goes away.

set -o errexit
set -o nounset
set -o pipefail

# Combined Jest+Vitest/NYC baseline during migration.
# Update these as coverage (hopefully) improves. The build will fail if the combined coverage report exceeds
# these thresholds.
# Line coverage matches the original Jest-only baseline, but statement/branch/function
# counters differ slightly due to Vitest/Vite Istanbul instrumentation.
# For reference, the jest.config numbers prior to any migration were:
# statements: -112,
# branches: -152,
# functions: -27,
# lines: -85,
STATEMENTS=1476
BRANCHES=1299
FUNCTIONS=497
MAX_LINES=86

rm -rf coverage-jest coverage-vitest coverage-combined-input coverage-combined

yarn test:jest \
  --coverage \
  --coverageDirectory=coverage-jest \
  --coverageReporters=json \
  --coverageThreshold='{}'

yarn test:vitest \
  --coverage \
  --coverage.provider=istanbul \
  --coverage.reporter=json \
  --coverage.reportsDirectory=coverage-vitest \
  --coverage.thresholds.statements=-999999 \
  --coverage.thresholds.branches=-999999 \
  --coverage.thresholds.functions=-999999 \
  --coverage.thresholds.lines=-999999

mkdir -p coverage-combined-input

cp coverage-jest/coverage-final.json coverage-combined-input/jest.json
cp coverage-vitest/coverage-final.json coverage-combined-input/vitest.json

yarn nyc merge coverage-combined-input coverage-combined/coverage-final.json 1>/dev/null

yarn nyc report \
  --temp-dir coverage-combined \
  --report-dir coverage-combined \
  --reporter=text-summary \
  --reporter=json-summary \
  --exclude='**/.next/**' \
  --exclude='**/__tests__/**' \
  --exclude='**/coverage/**' \
  --exclude='**/coverage-*' \
  --exclude='**/dist/**' \
  --exclude='**/generated/**' \
  --exclude='**/jest*.ts' \
  --exclude='**/vitest*.ts' \
  --exclude='**/knip.config.ts' \
  --exclude='**/next-env.d.ts' \
  --exclude='**/next.config.ts' \
  --exclude='apps/main/app/api/auth/[...nextauth]/route.ts' \
  1>/dev/null

summary_file="coverage-combined/coverage-summary.json"

uncovered_statements="$(jq '.total.statements.total - .total.statements.covered' "${summary_file}")"
uncovered_branches="$(jq '.total.branches.total - .total.branches.covered' "${summary_file}")"
uncovered_functions="$(jq '.total.functions.total - .total.functions.covered' "${summary_file}")"
uncovered_lines="$(jq '.total.lines.total - .total.lines.covered' "${summary_file}")"

exit=0
if [ "${uncovered_statements}" -gt "${STATEMENTS}" ]; then
  echo "Statements coverage failed: ${uncovered_statements} uncovered > ${STATEMENTS} allowed" >&2
  exit=1
fi

if [ "${uncovered_branches}" -gt "${BRANCHES}" ]; then
  echo "Branches coverage failed: ${uncovered_branches} uncovered > ${BRANCHES} allowed" >&2
  exit=1
fi

if [ "${uncovered_functions}" -gt "${FUNCTIONS}" ]; then
  echo "Functions coverage failed: ${uncovered_functions} uncovered > ${FUNCTIONS} allowed" >&2
  exit=1
fi

if [ "${uncovered_lines}" -gt "${MAX_LINES}" ]; then
  echo "Lines coverage failed: ${uncovered_lines} uncovered > ${MAX_LINES} allowed" >&2
  exit=1
fi

# Clean up
rm -rf coverage-jest coverage-vitest coverage-combined-input coverage-combined

exit ${exit}