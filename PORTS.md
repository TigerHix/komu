# Port Configuration

All services use configurable ports via environment variables to avoid conflicts.

## Default Ports

| Service | Default Port | Environment Variable |
|---------|-------------|---------------------|
| Frontend | 5847 | `FRONTEND_PORT` |
| Backend | 3847 | `BACKEND_PORT` |
| Inference | 8847 | `INFERENCE_PORT` |

## Configuration

### 1. Backend (.env)
```bash
BACKEND_PORT=3847
FRONTEND_PORT=5847      # For CORS configuration
INFERENCE_PORT=8847     # For service communication
```

### 2. Frontend (.env)
```bash
FRONTEND_PORT=5847
VITE_BACKEND_PORT=3847  # For WebSocket connections
```

### 3. Inference (.env)
```bash
INFERENCE_PORT=8847
FRONTEND_PORT=5847      # For CORS configuration
BACKEND_PORT=3847       # For CORS configuration
```

## Why These Ports?

- **5847, 3847, 8847**: Less commonly used ports to avoid conflicts
- **Pattern**: All end in 847 for easy remembering
- **Spacing**: Different thousands to avoid sequential conflicts

## Legacy Compatibility

The services still accept connections from legacy ports for smooth transition:
- Frontend: 5173 (Vite default)
- Backend: 3001 (Previous default)
- Inference: 8000 (Previous default)

## Service URLs

With default configuration:
- **Frontend**: http://localhost:5847
- **Backend API**: http://localhost:3847/api
- **Backend WebSocket**: ws://localhost:3847/ws
- **Inference API**: http://localhost:8847

## Changing Ports

1. Copy the `.env.example` files to `.env` in each service directory
2. Modify the port values as needed
3. Ensure all services reference the same ports consistently
4. Restart all services

## Production Deployment

For production, consider:
- Using standard ports (80/443) behind a reverse proxy
- Setting up domain-based routing instead of port-based
- Environment-specific configuration management