# Development Dockerfile for Medusa
FROM node:20-alpine

# Set working directory
WORKDIR /server

# Copy package files and yarn config
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn/releases .yarn/releases

# Install all dependencies using yarn
RUN yarn install

RUN find node_modules/@medusajs/dashboard -type f \( -name "*.js" -o -name "*.mjs" -o -name "*.json" \) \
	-exec sed -i 's/Welcome to Medusa/Welcome to thaivai/g' {} +

# Copy source code
COPY . .

# Normalize line endings and ensure startup script is executable
RUN sed -i 's/\r$//' ./start.sh && chmod +x ./start.sh

# Expose the port Medusa runs on
EXPOSE 9000 5173

# Start with migrations and then the development server
CMD ["sh", "-c", "sed -i 's/\\r$//' /server/start.sh; sh /server/start.sh"]