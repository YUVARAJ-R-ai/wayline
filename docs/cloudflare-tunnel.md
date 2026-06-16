# Cloudflare Tunnel Setup for `api-gateway`

To expose the locally hosted `api-gateway` (running on `localhost:3000`) securely to the internet (e.g., for Vercel frontend communication), we use [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/). This avoids NAT issues without needing to expose open ports.

## Prerequisites
- A Cloudflare account with a domain you control.
- `cloudflared` CLI installed.

## Setup Instructions

1. **Install cloudflared:**
   - Linux (Arch): `yay -S cloudflared`
   - MacOS: `brew install cloudflare/cloudflare/cloudflared`
   - Windows: Download the `.exe` from the [official repository](https://github.com/cloudflare/cloudflared/releases) or use winget `winget install Cloudflare.cloudflared`.

2. **Authenticate with Cloudflare:**
   ```bash
   cloudflared tunnel login
   ```
   This will open a browser window for you to select the domain you want to route the tunnel to.

3. **Create the Tunnel:**
   ```bash
   cloudflared tunnel create wayline-backend
   ```
   *Note: This command generates a UUID and a credentials file (e.g., `wayline-backend.json`) in your `.cloudflared` directory.*

4. **Route DNS to the Tunnel:**
   Replace `<yourdomain>` with your actual domain:
   ```bash
   cloudflared tunnel route dns wayline-backend api.<yourdomain>
   ```

5. **Configure the Tunnel:**
   Create or edit the configuration file located at `~/.cloudflared/config.yml` (or `%USERPROFILE%\.cloudflared\config.yml` on Windows):

   ```yaml
   tunnel: <your-tunnel-uuid>
   credentials-file: /path/to/.cloudflared/<your-tunnel-uuid>.json

   ingress:
     - hostname: api.<yourdomain>
       service: http://localhost:3000
     # Catch-all rule (required)
     - service: http_status:404
   ```

6. **Run the Tunnel:**
   ```bash
   cloudflared tunnel run wayline-backend
   ```

## Using the Tunnel
Once the tunnel is running, your local `api-gateway` is accessible publicly.

- **Public Hostname:** `https://api.<yourdomain>` *(Update this doc with the real hostname once established)*
- **Local Fallback:** If you're testing throwaway logic quickly, you can use `ngrok http 3000`.

## Notes
- The `.cloudflared/` directory and `.json` credential files are added to `.gitignore` to prevent secret leakage.
- Production usage and API-key enforcement are handled separately.
