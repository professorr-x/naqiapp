from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
import socketio
import time

# Initialize Firebase Admin SDK (includes Firestore)
from app.firebase_admin import initialize_firebase
initialize_firebase()

# Import Socket.IO chat server
from app.sockets.chat import sio

app = FastAPI(
    title="NAQI API",
    description="Backend API for NAQI water delivery app",
    version="1.0.0",
)

# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()

    # Log incoming request
    auth_header = request.headers.get("authorization", "None")
    auth_preview = auth_header[:30] + "..." if len(auth_header) > 30 else auth_header
    print(f"[REQUEST] {request.method} {request.url.path} - Auth: {auth_preview}")

    # Process request
    response = await call_next(request)

    # Log response
    duration = time.time() - start_time
    print(f"[RESPONSE] {request.method} {request.url.path} - Status: {response.status_code} - Duration: {duration:.2f}s")

    return response

# Configure CORS
# For development, allow all origins. For production, use settings.cors_origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.DEBUG else settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {
        "message": "NAQI API is running",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


# Include routers
from app.api import orders, vouchers, settings as settings_api, auth, users, device_tokens

app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(users.router, tags=["Users"])
app.include_router(orders.router, prefix="/api/orders", tags=["Orders"])
app.include_router(vouchers.router, prefix="/api/vouchers", tags=["Vouchers"])
app.include_router(settings_api.router, prefix="/api/settings", tags=["Settings"])
app.include_router(device_tokens.router, prefix="/api/device-tokens", tags=["Device Tokens"])


# Wrap FastAPI with Socket.IO
socket_app = socketio.ASGIApp(
    sio,
    other_asgi_app=app,
    socketio_path='/socket.io'
)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:socket_app",  # Use socket_app instead of app
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
