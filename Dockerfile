# Development Dockerfile for Medusa
FROM node:20-alpine

# Set working directory
WORKDIR /server

# Copy package files and yarn config
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn/releases .yarn/releases

ENV YARN_ENABLE_IMMUTABLE_INSTALLS=true
# Install all dependencies using yarn with immutable flag
RUN yarn install --immutable
# Docker BuildKit instructions (for advanced caching)
# To build with BuildKit, use:
# DOCKER_BUILDKIT=1 docker build -f Dockerfile .

RUN find node_modules/@medusajs/dashboard -type f \( -name "*.js" -o -name "*.mjs" -o -name "*.json" \) \
	-exec sed -i 's/Welcome to Medusa/Welcome to thaivai/g' {} +

## Copy everything except admin assets (excluded by .dockerignore)
COPY . .

# Normalize line endings and ensure startup script is executable
RUN sed -i 's/\r$//' ./start.sh && chmod +x ./start.sh

# Expose the port Medusa runs on
EXPOSE 9000 5173

# Start with migrations and then the development server
CMD ["sh", "-c", "sed -i 's/\\r$//' /server/start.sh; sh /server/start.sh"]