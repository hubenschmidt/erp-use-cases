FROM node:22-alpine AS dev

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for tsx)
RUN npm install

# Source is mounted via docker-compose volume
# Run with hot reload
CMD ["npm", "run", "dev"]
