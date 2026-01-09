FROM node:20-slim

# Install build dependencies for native modules (like better-sqlite3)
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Expose the port
EXPOSE 5000

# Start the application
CMD ["npm", "start"]
