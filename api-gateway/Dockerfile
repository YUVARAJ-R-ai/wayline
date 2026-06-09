# /wayline/api-gateway/Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# EXPOSE the port defined in docker-compose.yml environment
EXPOSE 3000
# Use the PORT environment variable if available, otherwise default to 3000
CMD ["node", "app.js"]