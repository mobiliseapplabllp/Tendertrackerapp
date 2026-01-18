# SSH Tunnel Guide

Quick guide to access the production server application locally via SSH tunnel.

## Quick Start

```bash
# Start the tunnel
./tunnel.sh

# Or manually:
sshpass -p 'gC6wG3qZz0M4' ssh -o StrictHostKeyChecking=no \
  -L 5000:localhost:5000 \
  -L 3000:localhost:80 \
  -N root@10.26.1.84 &
```

## Access Points

Once the tunnel is running:

- **Backend API**: http://localhost:5000
- **Frontend**: http://localhost:3000 (if Nginx is configured)

## Test Connection

```bash
# Test backend API
curl http://localhost:5000/api/v1/health

# Or open in browser
open http://localhost:5000
```

## Stop Tunnel

```bash
# Find the tunnel process
ps aux | grep "ssh.*10.26.1.84" | grep -v grep

# Kill by process ID
kill <PID>

# Or kill all SSH tunnels to this server
pkill -f 'ssh.*10.26.1.84'
```

## Troubleshooting

**Tunnel not working?**
- Check VPN connection is active
- Verify ports 5000 and 3000 are not already in use locally
- Check server is running: `ssh root@10.26.1.84 'pm2 status'`

**Port already in use?**
```bash
# Check what's using the port
lsof -i :5000
lsof -i :3000

# Kill the process if needed
kill <PID>
```

## Notes

- Tunnel runs in background
- Requires VPN connection to 10.26.1.84
- Uses password authentication (consider SSH keys for production)
