# Claudiator - Multi-Terminal Management for Claude Code
# https://github.com/G-TechSD/claudiator

FROM node:20-slim

LABEL maintainer="G-TechSD"
LABEL description="Multi-terminal management for Claude Code CLI sessions"
LABEL org.opencontainers.image.source="https://github.com/G-TechSD/claudiator"

# Install tmux and other dependencies
RUN apt-get update && apt-get install -y \
    tmux \
    git \
    curl \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Install Claude Code CLI (placeholder - user needs API key)
# RUN npm install -g @anthropic-ai/claude-code

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production=false

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Create non-root user for security (optional)
# RUN useradd -m -s /bin/bash claudiator
# USER claudiator

# Expose port
EXPOSE 3200

# Environment variables
ENV NODE_ENV=production
ENV PORT=3200
ENV CLAUDIATOR_PORT=3200
ENV CLAUDIATOR_TMUX_ENABLED=true
ENV CLAUDIATOR_HOST=0.0.0.0

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3200/api/health || exit 1

# Start the server
CMD ["npm", "start"]
