#!/bin/bash

# ARI Agent Loop Runner
# Runs Codex CLI in a loop, executing prompt.md until implementation is complete

set -e

# Configuration
MODEL="gpt-5.2"
REASONING_EFFORT="high"
PROMPT_FILE="prompt.md"
MAX_ITERATIONS=100  # Safety limit
LOG_DIR="logs"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="$LOG_DIR/agent_run_$TIMESTAMP.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create logs directory
mkdir -p "$LOG_DIR"

# Function to check if all steps are complete
check_completion() {
    # Count incomplete steps ([ ]) in implementation-plan.md
    incomplete=$(grep -c '^\*\*Status:\*\* \[ \]' implementation-plan.md 2>/dev/null || echo "0")
    echo "$incomplete"
}

# Function to get current step
get_current_step() {
    # Find first incomplete step
    grep -B2 '^\*\*Status:\*\* \[ \]' implementation-plan.md | head -1 | sed 's/## //'
}

# Log function
log() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

# Header
echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                    ARI Agent Loop Runner                       ║"
echo "║                                                                 ║"
echo "║  Model: $MODEL (reasoning: $REASONING_EFFORT)                   ║"
echo "║  Mode: YOLO (dangerously-bypass-approvals-and-sandbox)         ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

log "INFO" "Starting agent loop"
log "INFO" "Model: $MODEL"
log "INFO" "Log file: $LOG_FILE"

# Check if prompt.md exists
if [ ! -f "$PROMPT_FILE" ]; then
    log "ERROR" "prompt.md not found!"
    exit 1
fi

# Check if implementation-plan.md exists
if [ ! -f "implementation-plan.md" ]; then
    log "ERROR" "implementation-plan.md not found!"
    exit 1
fi

# Initialize git if not already
if [ ! -d ".git" ]; then
    log "INFO" "Initializing git repository"
    git init
    git add -A
    git commit -m "Initial commit: Project setup"
fi

# Main loop
iteration=0
while [ $iteration -lt $MAX_ITERATIONS ]; do
    iteration=$((iteration + 1))

    # Check if all steps complete
    incomplete=$(check_completion)
    if [ "$incomplete" -eq 0 ]; then
        echo -e "${GREEN}"
        echo "╔═══════════════════════════════════════════════════════════════╗"
        echo "║                    ALL STEPS COMPLETE!                         ║"
        echo "╚═══════════════════════════════════════════════════════════════╝"
        echo -e "${NC}"
        log "SUCCESS" "All implementation steps completed!"
        break
    fi

    # Get current step
    current_step=$(get_current_step)

    echo -e "${YELLOW}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  Iteration: $iteration / $MAX_ITERATIONS"
    echo "  Remaining steps: $incomplete"
    echo "  Current step: $current_step"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${NC}"

    log "INFO" "=== Iteration $iteration ==="
    log "INFO" "Current step: $current_step"
    log "INFO" "Remaining steps: $incomplete"

    # Read prompt content
    PROMPT_CONTENT=$(cat "$PROMPT_FILE")

    # Run Codex CLI
    log "INFO" "Starting Codex CLI execution..."

    # Execute with all options:
    # --model: gpt-5.2 with high reasoning effort
    # --dangerously-bypass-approvals-and-sandbox: YOLO mode (skips approvals + no sandbox)
    # --skip-git-repo-check: Allow running anywhere
    # Streaming is enabled by default in exec mode
    codex exec \
        --model "$MODEL" \
        -c model_reasoning_effort="$REASONING_EFFORT" \
        --dangerously-bypass-approvals-and-sandbox \
        --skip-git-repo-check \
        "$PROMPT_CONTENT" \
        2>&1 | tee -a "$LOG_FILE"

    EXIT_CODE=${PIPESTATUS[0]}

    if [ $EXIT_CODE -ne 0 ]; then
        log "WARNING" "Codex exited with code $EXIT_CODE"
        echo -e "${RED}Codex exited with non-zero code. Continuing to next iteration...${NC}"
    else
        log "INFO" "Codex execution completed successfully"
    fi

    # Brief pause between iterations
    echo -e "${BLUE}Pausing 5 seconds before next iteration...${NC}"
    sleep 5

done

# Final summary
echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                      LOOP COMPLETED                            ║"
echo "╠═══════════════════════════════════════════════════════════════╣"
echo "║  Total iterations: $iteration"
echo "║  Log file: $LOG_FILE"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

log "INFO" "Agent loop completed after $iteration iterations"
