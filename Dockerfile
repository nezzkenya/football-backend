# Use the official Puppeteer image
FROM ghcr.io/puppeteer/puppeteer:22.10.0

# Set environment variables
ENV PORT=3000 \
    URI=mongodb+srv://nezz:somo@cluster0.kvpnubw.mongodb.net/Games?retryWrites=true&w=majority \
    NODE_ENV=test

# Set the working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application code
COPY . .

# Expose the application port
EXPOSE 3000

# Command to run the app
CMD [ "node", "index.js" ]
