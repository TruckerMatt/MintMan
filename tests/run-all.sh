#!/usr/bin/env bash
# Runs every suite sequentially (software GL; ~10 min). Usage: cd tests && npm i && ./run-all.sh
cd "$(dirname "$0")"; mkdir -p shots; rc=0
for t in regress real rooms-suite final audio voice-ids states; do
  echo "=== $t ==="; timeout 600 node $t.js 2>&1 | tee shots/$t.out | grep -E "^(PASS|FAIL|  |[0-9]+/[0-9]+ passed|HARNESS)" | grep -vE "^PASS" ; [ ${PIPESTATUS[0]} -eq 0 ] || rc=1
done; echo; grep -h "passed" shots/*.out; exit $rc
