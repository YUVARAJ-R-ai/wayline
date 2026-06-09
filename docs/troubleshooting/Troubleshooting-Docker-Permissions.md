![[Pasted image 20250712154628.png]]

![[Pasted image 20250712154643.png]]

---

## Troubleshooting Guide: Docker Permissions, Filesystems, and Data Persistence

### 1. Executive Summary (TL;DR)

This document details the resolution of a series of cascading Docker build failures on an Arch Linux host.

*   **Initial Goal:** Move the Docker data root to a secondary drive (`/mnt/data1`) to save space on the OS drive.
*   **The Symptom:** Build failures within a custom PostgreSQL container, initially appearing as GPG signature errors during `apt-get update`, and later as permission errors (`Operation not permitted`, `invalid permissions`).
*   **The Root Cause:** The secondary drive (`/mnt/data1`) was formatted with an **NTFS filesystem**. NTFS does not support the native POSIX file permissions that Docker and its containers (especially security-conscious services like PostgreSQL) rely on. This created a fundamental incompatibility when using a **bind mount** for the database's data directory.
*   **The Final Solution:** Switching from a bind mount to a **Docker Named Volume** for the PostgreSQL data. This allows Docker to manage the volume within its own storage area using a compatible filesystem driver, completely bypassing the limitations of the host's NTFS partition.

### 2. The Debugging Journey: A Cascade of Errors

Our troubleshooting process was a journey of peeling back layers, where solving one problem revealed a deeper one underneath.

#### Error 1: `apt-get` GPG Signature Failure

*   **Symptom:** The build failed inside the `postgres/Dockerfile` with `GPG error: ... InRelease is not signed` and `At least one invalid signature was encountered`.
*   **Initial Hypotheses:**
    1.  **System Clock Drift:** A common cause for GPG errors. We checked the host's time (`timedatectl`) and enabled NTP. This did not solve the issue.
    2.  **Network/DNS Issues:** Problems resolving the Debian servers. We configured Docker's DNS to use Google's servers (`8.8.8.8`). This did not solve the issue.
    3.  **Missing Certificates:** The base image might be missing security certificates. We added `ca-certificates` and `gnupg` to the install command. This did not solve the issue.
*   **Conclusion:** These are all valid first steps for a GPG error, but in this case, the GPG failure was only a *symptom* of a deeper problem, not the cause itself.

#### Error 2: `fchmod (1: Operation not permitted)`

*   **Symptom:** After trying forceful workarounds (`--allow-unauthenticated`), a new, more specific error appeared: `Could not change permissions for temporary file ... fchmod (1: Operation not permitted)`.
*   **Diagnosis:** This was the first major clue. It meant the `apt` process, running as `root` *inside the container*, was being denied permission to change file attributes on the host filesystem. This pointed the investigation away from networking and towards host-level permissions.
*   **Hypothesis:** We suspected a Linux Security Module like AppArmor or SELinux was interfering. `aa-status` and `sestatus` showed this was not the case.

#### Error 3: The `docker-compose.yml` "Red Herring"

*   **Symptom:** While troubleshooting, we encountered various `path not found` errors.
*   **Cause:** These were caused by simple typos in the project structure (e.g., `api_gateway` vs. `api-gateway`) or by running `docker-compose` from a directory path that contained a space (`/maps api/`).
*   **Resolution:** Renaming the folders correctly and ensuring no spaces were in the path fixed these issues. This was a separate, but important, cleanup step.

#### Error 4: The Docker Service Startup Failure

*   **Symptom:** `Job for docker.service failed because the control process exited with error code`.
*   **Cause:** This was a self-inflicted error caused by my incorrect advice. I suggested commenting out a line in `/etc/docker/daemon.json` using a `#` character. **JSON files do not support `#` comments**, which made the file invalid and caused the Docker daemon to crash on startup.
*   **Resolution:** We used `journalctl -xeu docker.service` to find the exact error, then renamed the broken `daemon.json` file to allow Docker to start with its default configuration.

#### Error 5: The Final, Definitive Clues

With Docker running on the default `/var/lib/docker` (an `ext4` partition), the build succeeded perfectly. When we switched back to `/mnt/data1` (the NTFS partition), two final errors occurred:

1.  **`chmod: changing permissions of '/var/lib/postgresql/data': Operation not permitted`**: The container could not change ownership of the volume.
2.  **`FATAL: data directory "/var/lib/postgresql/data" has invalid permissions`**: After we used a `user: "1000"` workaround, the directory was created, but PostgreSQL's internal security check detected that the permissions were too open (a side effect of NTFS) and refused to start.

This combination proved conclusively that the NTFS filesystem was the root cause.

### 3. The Definitive Solution: Named Volumes vs. Bind Mounts

The solution was to stop fighting the filesystem and use the correct Docker tool for the job.

*   **Bind Mount (What we were using):**
    ```yaml
    volumes:
      - ./data/postgres:/var/lib/postgresql/data
    ```    This directly maps a folder from the host into the container. The container is subject to all the permission rules and filesystem limitations of the host's drive. **This is unsuitable for databases on non-Linux filesystems.**

*   **Named Volume (The Solution):**
    ```yaml
    # In the service:
    volumes:
      - postgres_data:/var/lib/postgresql/data

    # At the end of the file:
    volumes:
      postgres_data:
    ```
    This tells Docker: "Create and manage a volume for me named `postgres_data`." Docker creates this volume inside its own storage area (`/mnt/data1/docker/volumes/`) using a Linux-native filesystem driver. This creates a "permission-safe bubble" where the container has full control, regardless of the underlying host filesystem.

### 4. Key Takeaways and Best Practices

1.  **Databases on External Drives:** When storing database data on a secondary drive, always ensure that drive is formatted with a native Linux filesystem like `ext4`.
2.  **Named Volumes over Bind Mounts:** For any service that manages its own data with strict permissions (like PostgreSQL, MySQL, Elasticsearch), **always prefer Docker Named Volumes over Bind Mounts**. Bind mounts are best for mounting your application's source code.
3.  **Interpret GPG Errors with Caution:** An `apt-get` GPG error is not always a network problem. It can be a symptom of a lower-level filesystem permission issue.
4.  **Use `journalctl`:** For debugging failing system services on Linux, `journalctl -xeu <service-name>.service` is your most powerful tool.
5.  **Validate Config Files:** Always ensure the syntax of configuration files (`.json`, `.yaml`) is correct. A small typo can cause the entire service to fail.