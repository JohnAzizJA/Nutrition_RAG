# Secure Authentication Implementation

## ✅ Completed Features

### Backend Security
1. **Password Hashing (Argon2)**
   - Passwords are hashed before storing in database
   - Uses `pwdlib` with Argon2 hasher (recommended by FastAPI)
   - Verification on login with `verify_password()`

2. **JWT Token Generation**
   - Access tokens generated with `pyjwt` (recommended by FastAPI)
   - Contains user ID in payload (`sub` claim)
   - 24-hour expiration for access tokens
   - 30-day expiration for refresh tokens
   - Signed with secret key
   - Stateless JWT approach (no database storage)

3. **Auth Utilities** (`backend/app/auth/utils.py`)
   - `hash_password()` - Hash passwords with Argon2
   - `verify_password()` - Verify password against hash
   - `create_access_token()` - Generate JWT access tokens
   - `create_refresh_token()` - Generate JWT refresh tokens
   - `decode_access_token()` - Decode and verify access tokens
   - `decode_refresh_token()` - Decode and verify refresh tokens

4. **Auth Middleware** (`backend/app/auth/middleware.py`)
   - `get_current_user()` - FastAPI dependency for protected routes
   - Validates JWT from Authorization header
   - Returns authenticated user object

5. **Updated Auth Endpoints**
   - `/api/auth/register` - Returns JWT tokens + user data
   - `/api/auth/login` - Returns JWT tokens + user data
   - `/api/auth/refresh` - Exchange refresh token for new tokens
   - `/api/auth/logout` - Client clears tokens
   - Email uniqueness check on registration

### Frontend Security
1. **Secure Token Storage**
   - Uses `expo-secure-store` (encrypted storage)
   - Both access and refresh tokens stored in device keychain/keystore
   - `authStorage` utility for save/get/remove operations
   - `clearAll()` method to remove all tokens on logout

2. **Updated API Client**
   - `AuthResponse` interface with access_token + refresh_token + user
   - Login and register return both tokens
   - `refresh()` method to get new tokens
   - `logout()` method to revoke refresh token

3. **Updated Screens**
   - Login screen saves both tokens after successful login
   - Register screen saves both tokens after successful registration
   - Tokens automatically refreshed when access token expires

## 🔐 Security Features

### What's Secure Now:
✅ Passwords hashed with Argon2 (industry standard, recommended by FastAPI)
✅ JWT tokens with pyjwt (recommended by FastAPI)
✅ Tokens stored in encrypted storage (not plain AsyncStorage)
✅ Token expiration (24 hours for access, 30 days for refresh)
✅ Email uniqueness validation
✅ Refresh tokens for long-term sessions (stateless JWT)

### What's Still Needed:
- [ ] Password strength validation
- [ ] Email verification
- [ ] Password reset flow
- [ ] Data Input Validation

## 📝 Environment Variables

Add to `.env`:
```
JWT_SECRET_KEY=your_secret_key_here  # Generate with: openssl rand -hex 32
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=1440
JWT_REFRESH_TOKEN_EXPIRE_DAYS=30
```

## 🚀 Installation

Backend:
```bash
cd backend
pip install -r requirements.txt
```

Frontend:
```bash
cd frontend/Nutrition-App
npx expo install expo-secure-store
```

## 🔧 Usage

### Protected Routes (Backend)
```python
from fastapi import Depends
from auth.middleware import get_current_user
from db.models import User

@router.get("/protected")
async def protected_route(current_user: User = Depends(get_current_user)):
    return {"message": f"Hello {current_user.name}"}
```

### API Calls with Token (Frontend)
```typescript
import { authStorage } from '@/src/utils/authStorage';

const token = await authStorage.getToken();
const response = await fetch(`${API_BASE_URL}/api/protected`, {
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});
```

## 🧪 Testing

1. Start backend: `cd backend && uvicorn app.main:app --reload`
2. Start frontend: `cd frontend/Nutrition-App && npx expo start`
3. Register a new account
4. Check database - password should be hashed (Argon2 format)
5. Login with same credentials
6. Token stored securely in device

## 🔒 Security Best Practices Implemented

1. **Never store plain text passwords** ✅
2. **Use strong hashing algorithm (Argon2)** ✅
3. **Store tokens securely (encrypted storage)** ✅
4. **Use JWT for stateless auth** ✅
5. **Set token expiration** ✅
6. **Validate tokens on protected routes** ✅

## 📚 Libraries Used (FastAPI Recommended)

- **pwdlib[argon2]** - Password hashing with Argon2
- **pyjwt** - JWT token generation and validation
- **expo-secure-store** - Encrypted token storage on mobile


## 🔄 Refresh Token Flow

### How It Works
1. User logs in → Receives access token (24h) + refresh token (30 days)
2. Both tokens stored securely in device
3. Access token used for API requests
4. When access token expires → Use refresh token to get new tokens
5. Old refresh token revoked, new one issued (token rotation)
6. On logout → Refresh token revoked in database

### Backend Usage

**Refresh Token Endpoint:**
```python
# POST /api/auth/refresh
{
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}

# Response:
{
  "access_token": "new_access_token",
  "refresh_token": "new_refresh_token",
  "token_type": "bearer",
  "user": {...}
}
```

**Logout Endpoint:**
```python
# POST /api/auth/logout
{
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}

# Response:
{
  "message": "Logged out successfully"
}
```

### Frontend Usage

**Refresh Tokens:**
```typescript
import { authStorage } from '@/src/utils/authStorage';
import { api } from '@/src/api/client';

const refreshToken = await authStorage.getRefreshToken();
if (refreshToken) {
  const response = await api.refresh(refreshToken);
  await authStorage.saveToken(response.access_token);
  await authStorage.saveRefreshToken(response.refresh_token);
}
```

**Logout:**
```typescript
await api.logout();
await authStorage.clearAll();
```

## 🗄️ Database Schema

No additional tables needed - refresh tokens are stateless JWTs.

## 🔒 Security Benefits

1. **Short-lived access tokens** - Reduces risk if token is compromised
2. **Long-lived refresh tokens** - Better user experience (30 days)
3. **Stateless** - No database overhead for token management
4. **Expiration** - Both tokens have expiration built into JWT
5. **Encrypted storage** - Tokens stored securely on device
