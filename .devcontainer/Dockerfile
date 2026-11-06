FROM mcr.azure.cn/devcontainers/base:trixie

ARG NODE_VERSION=26.13.0
ARG VP_VERSION=1.5.0
ARG PNPM_VERSION=12.18.0
ARG PLAYWRIGHT_VERSION=1.65.0-alpha-2026-10-30

# Mount targets (volumes) must exist and be owned by vscode before mounting.
RUN mkdir -p /home/vscode/.vscode-server /home/vscode/.claude /home/vscode/.cache /pnpm-store /ms-playwright && \
    chown -R vscode:vscode /home/vscode/.vscode-server /home/vscode/.claude /home/vscode/.cache /pnpm-store /ms-playwright

# Add host.docker.internal / host.external IPs to NO_PROXY at shell start.
COPY no-proxy-host.sh /etc/profile.d/20-no-proxy-host.sh
RUN echo '. /etc/profile.d/20-no-proxy-host.sh' >> /etc/bash.bashrc

USER vscode

# Vite+ (vp) with a pinned Node.js and pnpm.
ENV VP_HOME=/home/vscode/.vite-plus \
    VP_NODE_MANAGER=yes
ENV PATH=${VP_HOME}/bin:${PATH}
RUN curl -fsSL https://vite.plus | VP_VERSION=${VP_VERSION} bash && \
    vp env install ${NODE_VERSION} pnpm@${PNPM_VERSION} && \
    vp env default ${NODE_VERSION} pnpm@${PNPM_VERSION} && \
    node --version && pnpm --version && vp --version

# Playwright Chromium for the Playwright MCP server (.mcp.json).
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN npx -y playwright@${PLAYWRIGHT_VERSION} install chromium && \
    sudo -E env "PATH=${PATH}" npx -y playwright@${PLAYWRIGHT_VERSION} install-deps chromium && \
    sudo rm -rf /var/lib/apt/lists/*
