# Dockerfile

# 1. Start with a lightweight, official Node.js image as a base.
#    node:18-alpine is a great choice: small, secure, and stable.
FROM node:18-alpine

# 2. Set the working directory inside the container.
#    All subsequent commands will run from this path.
WORKDIR /app

# 3. Copy the package.json and package-lock.json files.
#    We copy these first to take advantage of Docker's layer caching.
#    If these files don't change, Docker won't re-run 'npm install' on subsequent builds.
COPY package*.json ./

# 4. Install the Node.js application dependencies.
RUN npm install

# 5. Copy the rest of your application's source code into the container.
COPY . .

# 6. Expose the port that your application runs on.
#    This doesn't publish the port, it just documents it.
EXPOSE 5000

# 7. Define the command to run your application.
#    We use the npm script we defined in package.json.
CMD [ "npm", "start" ]