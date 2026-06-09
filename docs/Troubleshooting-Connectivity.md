You are absolutely right to ask for a debugging plan. My apologies that the previous steps didn't work. When you're in a situation like this, throwing more potential "fixes" at the problem isn't helpful. We need a systematic way to find the **exact point of failure**.

Let's do this properly. We are going to become detectives and follow a clear, step-by-step process to diagnose the connection problem. This guide will teach you how to debug any Docker-based microservice application.

---

### **The Systematic Debugging Guide**

The core question is: "Why can't the frontend talk to the backend?" There are three main possibilities:
1.  The `api-gateway` (backend) is crashing and isn't actually running.
2.  The `api-gateway` is running, but the `frontend` container cannot reach it over the internal Docker network.
3.  Both containers are running and can see each other, but the browser cannot reach the `api-gateway` due to a configuration issue.

We will test each of these possibilities in order.

---

### **Step 0: Get a Clean Start**

First, let's ensure we are starting from a known, clean state. From your `wayline` root directory, run:
```bash
docker-compose down
```
This stops and removes all containers, networks, and volumes defined in your compose file.

---

### **Step 1: Is the Backend Alive? (Test #1)**

Our first goal is to prove, with 100% certainty, whether your `api-gateway` is running correctly on its own. We will ignore the frontend for this step.

1.  **Start the Full Stack:**
    Run the application in the background (detached mode).
    ```bash
    docker-compose up --build -d
    ```
    This will start all services. Even if some fail, we can inspect them.

2.  **Check the Backend Logs:**
    Look specifically at the logs for the `api-gateway`.
    ```bash
    docker-compose logs api-gateway
    ```
    *   **✅ If you see:** `Wayline API server running on port 3000` (or similar), the server has started successfully. Proceed to the next test.
    *   **❌ If you see:** Any kind of error message, especially `Error: connect ECONNREFUSED` or any other database connection error, then the backend is crashing. **The problem is in your `api-gateway/app.js` or its database credentials.** Stop here and fix that error first.

3.  **Test the Connection from Your Host Machine:**
    This is the most crucial test. We will use `curl`, a command-line tool, to directly "knock on the door" of the `api-gateway` from your main Arch Linux terminal.
    ```bash
    curl http://localhost:3000/api/route
    ```
    *   **✅ If you get the response:** `Missing "from" or "to" query parameters.` **THIS IS A HUGE SUCCESS!** It proves your `api-gateway` is running, the port `3000` is correctly mapped to your host, and the server is responding to requests. You can proceed to Step 2.
    *   **❌ If you get the response:** `curl: (7) Failed to connect to localhost port 3000: Connection refused`. **This is our problem.** It means the `api-gateway` container is not running or is not correctly exposing port 3000. Go back and check its logs carefully.

---

### **Step 2: Can the Frontend Container See the Backend? (Test #2)**

If Step 1 succeeded, we know the backend is alive. Now we need to see if the `frontend` container can talk to it over the private network that Docker Compose creates.

1.  **Open a Shell Inside the Frontend Container:**
    This powerful command lets you "enter" the running `frontend` container.
    ```bash
    docker-compose exec frontend sh
    ```
    Your terminal prompt will change, indicating you are now inside the container.

2.  **Install `curl` inside the container:**
    The lightweight Alpine image doesn't come with `curl`, so we need to install it.
    ```sh
    # This command is run inside the container's shell
    apk add curl
    ```

3.  **Test the Connection to the Backend using its Service Name:**
    This is the most important part. Inside the Docker network, containers talk to each other using their **service names** from the `docker-compose.yml` file.
    ```sh
    # This command is run inside the container's shell
    curl http://api-gateway:3000/api/route
    ```
    *   **✅ If you get the response:** `Missing "from" or "to" query parameters.` This proves the internal Docker network is working perfectly. The `frontend` can find and communicate with the `api-gateway`. The problem must be in the browser. Proceed to Step 3.
    *   **❌ If you get an error:** like `curl: (6) Could not resolve host: api-gateway` or a connection timeout, it means there is a problem with the Docker network itself. This is rare, but it points to a problem in your `docker-compose.yml` networking configuration.
    *   **Once you are done, type `exit`** to leave the container's shell and return to your normal terminal.

---

### **Step 3: What Does the Browser See? (Test #3)**

If Steps 1 and 2 succeeded, the containers are healthy and can talk to each other. The problem must be how the browser is being told to connect to the API.

1.  **Open Your Application in the Browser:**
    Navigate to `http://localhost:8080`.

2.  **Open the Developer Tools:**
    Press `F12` or `Ctrl+Shift+I` (or `Cmd+Option+I` on Mac) to open the developer tools.

3.  **Go to the "Network" Tab.**

4.  **Trigger an API Call:**
    In your application's UI, do something that should call the API, like clicking the "Search" button.

5.  **Analyze the Network Tab:**
    A new line item should appear for the API request. Click on it.
    *   **Check the "Status":**
        *   ✅ If the status is `200 OK` or `400 Bad Request`, the connection worked!
        *   ❌ If the status is `(failed)` and the error is `net::ERR_CONNECTION_REFUSED`, this is the problem.
    *   **Check the "Headers" > "General" > "Request URL":**
        *   ✅ It **must** show `http://localhost:3000/api/geocode` (or similar).
        *   ❌ If it shows `http://api-gateway:3000/...` or `http://localhost:8080/api/...`, then your `NEXT_PUBLIC_API_URL` environment variable is not configured correctly in your `docker-compose.yml` or is not being used in your frontend code.

---

Please follow these steps in order. The very first one that fails will tell you exactly where the problem is. Let me know the results of these tests.