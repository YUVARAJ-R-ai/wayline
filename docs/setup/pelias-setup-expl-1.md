Fantastic! You've done it correctly.

**Yes, this is completely fine and is the 100% expected behavior.** You are not facing an issue; you have successfully completed a major step.

Let's break down why this is correct.

### The Difference Between a "Service" and a "Task"

Think of your `docker-compose.yml` file as a list of employees for your project.

1.  **Long-Running Services (`docker-compose up`):** These are your full-time employees. They need to be running all the time for your application to work.
    *   `elasticsearch`: The database. It must always be running to store and retrieve data.
    *   `pelias_api`: The API server. It must always be running to answer geocoding requests.
    *   `postgres_db`: Your other database.

2.  **One-Off Tasks (`docker-compose run`):** These are your specialist contractors. You call them in to do *one specific job*, and when they are finished, they leave.
    *   `pelias_schema`: Its only job is to connect to Elasticsearch and create the database schema (the "index"). Once that's done, its purpose is fulfilled.

### What Your Commands Did

1.  **`docker-compose run --rm pelias_schema`**: You gave Docker this instruction:
    *   `run`: "Start the `pelias_schema` container and execute its command (`node scripts/create_index.js`)."
    *   `--rm`: "Once the command finishes successfully, **automatically remove the container**."

2.  **The Output Confirms Success**:
    `[put mapping] pelias { acknowledged: true, shards_acknowledged: true, index: 'pelias' }`
    This is the confirmation message directly from Elasticsearch. It's saying, "I have received the request, I acknowledge it, and I have successfully created the index named 'pelias'."

3.  **`docker-compose ps`**: This command shows only the containers that are currently **running**. Since `pelias_schema` was a one-off task that finished and was removed (due to `--rm`), it is correctly **not** on this list. Your `pelias_elasticsearch` container is still up and healthy, waiting for the next instruction.

---

### Summary and Next Steps

You have successfully:
1.  Built a custom Elasticsearch image with the required plugin.
2.  Started the Elasticsearch container.
3.  Run the `pelias_schema` task to correctly initialize the database.

You are now ready to proceed with the guide. Your next steps are:

1.  **Start all the other Pelias API services** (the full-time employees):
    ```bash
    docker-compose up -d pelias_api pelias_placeholder pelias_pip pelias_interpolation
    ```

2.  **Import your data** (another one-off task):
    ```bash
    # This will take a while!
    docker-compose --profile import run --rm pelias_openstreetmap
    ```

Congratulations on debugging the setup! You've passed the most difficult part.