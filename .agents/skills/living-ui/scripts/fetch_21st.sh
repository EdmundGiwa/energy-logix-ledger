#!/usr/bin/env bash
# fetch_21st.sh — Helper script to query 21st.dev via CLI
set -euo pipefail

ACTION="${1:-help}"

check_cli() {
  if ! command -v 21st &> /dev/null; then
    echo "21st CLI not found globally. Running via npx @21st-dev/cli..."
    CLI_CMD="npx -y @21st-dev/cli"
  else
    CLI_CMD="21st"
  fi
}

check_auth() {
  if [ -z "${API_KEY_21ST:-}" ] && [ -z "${TWENTYFIRST_TOKEN:-}" ]; then
    echo "WARNING: Neither API_KEY_21ST nor TWENTYFIRST_TOKEN is set in environment."
    echo "Run '21st login' or 'export API_KEY_21ST=your_key'."
  fi
}

case "$ACTION" in
  search)
    QUERY="${2:-button}"
    LIMIT="${3:-5}"
    check_cli
    check_auth
    $CLI_CMD search "$QUERY" --type c --limit "$LIMIT" --json
    ;;

  get)
    ID="${2:-}"
    if [ -z "$ID" ]; then
      echo "Usage: $0 get <component-id>"
      exit 1
    fi
    check_cli
    check_auth
    $CLI_CMD get "$ID" --json
    ;;

  logo)
    QUERY="${2:-}"
    check_cli
    $CLI_CMD logo "$QUERY" --json
    ;;

  *)
    echo "Living UI - 21st.dev Query Helper"
    echo "Usage:"
    echo "  $0 search <query> [limit]   - Search components and print JSON"
    echo "  $0 get <component-id>       - Fetch full component code and metadata"
    echo "  $0 logo <query>             - Search logos (free, no auth required)"
    ;;
esac
