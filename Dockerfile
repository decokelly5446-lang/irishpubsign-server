FROM node:18-slim

# Install Python and required packages
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    && pip3 install Pillow boto3 --break-system-packages \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files and install Node dependencies
COPY package*.json ./
RUN npm install

# Copy rest of application
COPY . .

# Expose port
EXPOSE 3000

# Start server
CMD ["node", "index.js"]
