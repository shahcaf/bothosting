FROM node:18-slim

# Install git for repo cloning
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Create directory for bot storage
RUN mkdir -p /app/bots

# Expose the API port
EXPOSE 5000

# Start the server
CMD ["node", "index.js"]
