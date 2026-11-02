#!/bin/bash
# Claude must never run tests: test suites here can load .env, which points at the
# production database, and delete data. Blocks any Bash call that looks like a test run.
# Fails closed: if the input cannot be read, the call is blocked too.
input=$(cat)
cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // ""' 2>/dev/null) || cmd=$input

runners='jest|vitest|mocha|ava|karma|jasmine|cypress|playwright|pytest|nosetests|tox|nox|rspec|phpunit|pest'
pattern="(^|[^a-z0-9_-])($runners)([^a-z0-9_-]|\$)"
pattern+='|(npm|yarn|pnpm|bun)( run)?[ -](test|t)([^a-z]|$)'
pattern+='|npm-run-all.*test|turbo( run)? test|nx (run-many.*)?test'
pattern+='|node( [^|;&]*)? --test|(deno|go|cargo|swift|dotnet|mix|mvn|gradle|gradlew|rake|make|ctest) test'
pattern+='|python[0-9.]* -m (unittest|pytest)|xcodebuild.* test|bundle exec (rspec|rake test)'
pattern+='|(node|tsx|ts-node|bun|deno)( [^|;&]*)? [^ ]*\.(test|spec)\.[cm]?[jt]sx?|out/test/|NODE_ENV=test'

if printf '%s' "$cmd" | grep -Eiq -- "$pattern"; then
  echo "Running tests is forbidden: test suites can connect to the production database from .env and delete data. Ask the user to run tests themselves." >&2
  exit 2
fi
exit 0
