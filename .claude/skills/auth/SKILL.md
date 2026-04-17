---
name: auth
description: >
    Use when writing authentication, JWT handling, middleware, login/logout flows,
    refresh tokens, or any security-related code. Load alongside backend or frontend
    skill depending on context.
---

# Auth conventions — JWT + HttpOnly cookies

## Strategy

- Access token: short-lived JWT (15 minutes), stored in memory on the client.
- Refresh token: long-lived opaque token (7 days), stored in HttpOnly cookie.
- No tokens in localStorage or sessionStorage.
- CSRF protection via SameSite=Strict on the refresh cookie.

---

## Backend — Go

### JWT token generation

```go
// internal/infrastructure/auth/jwt.go
type Claims struct {
    UserID string `json:"sub"`
    Email  string `json:"email"`
    Role   string `json:"role"`
    jwt.RegisteredClaims
}

type JWTService struct {
    secret        []byte
    accessTTL     time.Duration
    refreshTTL    time.Duration
}

func NewJWTService(secret string) *JWTService {
    return &JWTService{
        secret:     []byte(secret),
        accessTTL:  15 * time.Minute,
        refreshTTL: 7 * 24 * time.Hour,
    }
}

func (s *JWTService) GenerateAccessToken(userID, email, role string) (string, error) {
    claims := Claims{
        UserID: userID,
        Email:  email,
        Role:   role,
        RegisteredClaims: jwt.RegisteredClaims{
            ExpiresAt: jwt.NewNumericDate(time.Now().Add(s.accessTTL)),
            IssuedAt:  jwt.NewNumericDate(time.Now()),
            ID:        uuid.NewString(),
        },
    }
    token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
    return token.SignedString(s.secret)
}

func (s *JWTService) ValidateAccessToken(tokenStr string) (*Claims, error) {
    token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(t *jwt.Token) (interface{}, error) {
        if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
            return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
        }
        return s.secret, nil
    })
    if err != nil {
        return nil, fmt.Errorf("invalid token: %w", err)
    }
    claims, ok := token.Claims.(*Claims)
    if !ok || !token.Valid {
        return nil, errors.New("invalid token claims")
    }
    return claims, nil
}
```

### Refresh token — stored in DB

```go
// domain/auth/refresh_token.go
type RefreshToken struct {
    id        string
    userID    string
    tokenHash string    // bcrypt hash — never store plain token
    expiresAt time.Time
    revokedAt *time.Time
}

func (t *RefreshToken) IsExpired() bool  { return time.Now().After(t.expiresAt) }
func (t *RefreshToken) IsRevoked() bool  { return t.revokedAt != nil }
func (t *RefreshToken) IsValid() bool    { return !t.IsExpired() && !t.IsRevoked() }
```

### Gin auth middleware

```go
// internal/infrastructure/http/gin/middleware/auth.go
func AuthMiddleware(jwtSvc *auth.JWTService) gin.HandlerFunc {
    return func(c *gin.Context) {
        header := c.GetHeader("Authorization")
        if header == "" || !strings.HasPrefix(header, "Bearer ") {
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing token"})
            return
        }

        tokenStr := strings.TrimPrefix(header, "Bearer ")
        claims, err := jwtSvc.ValidateAccessToken(tokenStr)
        if err != nil {
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
            return
        }

        // Attach claims to context for downstream handlers
        c.Set("userID", claims.UserID)
        c.Set("email",  claims.Email)
        c.Set("role",   claims.Role)
        c.Next()
    }
}

// Helper to extract userID in handlers
func GetUserID(c *gin.Context) (string, bool) {
    id, ok := c.Get("userID")
    if !ok {
        return "", false
    }
    return id.(string), true
}
```

### Login handler

```go
func (h *AuthHandler) Login(c *gin.Context) {
    var req LoginRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    resp, err := h.login.Execute(c.Request.Context(), req)
    if err != nil {
        switch {
        case errors.Is(err, domain.ErrUnauthorized):
            c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
        default:
            c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
        }
        return
    }

    // Refresh token -> HttpOnly cookie
    c.SetCookie(
        "refresh_token",
        resp.RefreshToken,
        int(7*24*time.Hour/time.Second),
        "/api/v1/auth",     // restrict to auth endpoints only
        "",                  // domain (empty = current)
        true,                // secure (HTTPS only)
        true,                // httpOnly
    )

    // Access token -> response body (stored in memory by client)
    c.JSON(http.StatusOK, gin.H{
        "access_token": resp.AccessToken,
        "expires_in":   900, // 15 minutes in seconds
    })
}

func (h *AuthHandler) Logout(c *gin.Context) {
    // Delete the cookie
    c.SetCookie("refresh_token", "", -1, "/api/v1/auth", "", true, true)

    refreshToken, err := c.Cookie("refresh_token")
    if err == nil {
        // Revoke in DB
        _ = h.logout.Execute(c.Request.Context(), refreshToken)
    }

    c.JSON(http.StatusOK, gin.H{"message": "logged out"})
}

func (h *AuthHandler) Refresh(c *gin.Context) {
    refreshToken, err := c.Cookie("refresh_token")
    if err != nil {
        c.JSON(http.StatusUnauthorized, gin.H{"error": "missing refresh token"})
        return
    }

    resp, err := h.refresh.Execute(c.Request.Context(), refreshToken)
    if err != nil {
        c.SetCookie("refresh_token", "", -1, "/api/v1/auth", "", true, true)
        c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired session"})
        return
    }

    // Rotate refresh token
    c.SetCookie("refresh_token", resp.RefreshToken, int(7*24*time.Hour/time.Second),
        "/api/v1/auth", "", true, true)
    c.JSON(http.StatusOK, gin.H{
        "access_token": resp.AccessToken,
        "expires_in":   900,
    })
}
```

### Password hashing

Always use bcrypt. Never md5, sha1, or plain text.

```go
import "golang.org/x/crypto/bcrypt"

const bcryptCost = 12

func HashPassword(password string) (string, error) {
    b, err := bcrypt.GenerateFromPassword([]byte(password), bcryptCost)
    return string(b), err
}

func CheckPassword(hash, password string) bool {
    return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) == nil
}
```

---

## Frontend — TypeScript

### Token storage strategy

```ts
// src/lib/auth.ts
// Access token lives in module-level memory only.
// Never localStorage, never sessionStorage.
let accessToken: string | null = null;

export function setAccessToken(token: string) {
    accessToken = token;
}
export function getAccessToken(): string | null {
    return accessToken;
}
export function clearAccessToken() {
    accessToken = null;
}
```

### Axios / fetch interceptor — auto-attach token + silent refresh

```ts
// src/lib/api.ts
import { getAccessToken, setAccessToken, clearAccessToken } from "./auth";

let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const token = getAccessToken();
    const res = await fetch(`${import.meta.env.VITE_API_URL}${path}`, {
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        ...init,
    });

    if (res.status === 401 && !path.includes("/auth/")) {
        return silentRefresh<T>(path, init);
    }

    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new ApiError(res.status, body.error ?? "Request failed");
    }
    return res.json();
}

async function silentRefresh<T>(path: string, init?: RequestInit): Promise<T> {
    if (isRefreshing) {
        // Queue the request until refresh completes
        return new Promise((resolve) => {
            refreshQueue.push((token) => resolve(request<T>(path, init)));
        });
    }

    isRefreshing = true;
    try {
        const res = await fetch(
            `${import.meta.env.VITE_API_URL}/api/v1/auth/refresh`,
            {
                method: "POST",
                credentials: "include",
            },
        );
        if (!res.ok) {
            clearAccessToken();
            window.location.href = "/login";
            throw new ApiError(401, "Session expired");
        }
        const data = await res.json();
        setAccessToken(data.access_token);
        refreshQueue.forEach((cb) => cb(data.access_token));
        refreshQueue = [];
        return request<T>(path, init);
    } finally {
        isRefreshing = false;
    }
}
```

### Auth React context

```tsx
// src/hooks/useAuth.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { setAccessToken, clearAccessToken } from "@/lib/auth";

export function useMe() {
    return useQuery({
        queryKey: ["me"],
        queryFn: () => api.get<User>("/api/v1/auth/me"),
        retry: false,
        staleTime: 5 * 60 * 1000,
    });
}

export function useLogin() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (creds: LoginRequest) =>
            api.post<LoginResponse>("/api/v1/auth/login", creds),
        onSuccess: (data) => {
            setAccessToken(data.access_token);
            qc.invalidateQueries({ queryKey: ["me"] });
        },
    });
}

export function useLogout() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: () => api.post("/api/v1/auth/logout", {}),
        onSuccess: () => {
            clearAccessToken();
            qc.clear();
        },
    });
}
```

### Protected route

```tsx
// src/components/common/ProtectedRoute.tsx
import { Navigate } from "react-router-dom";
import { useMe } from "@/hooks/useAuth";

interface ProtectedRouteProps {
    children: React.ReactNode;
    requiredRole?: "admin" | "member";
}

export function ProtectedRoute({
    children,
    requiredRole,
}: ProtectedRouteProps) {
    const { data: user, isLoading, isError } = useMe();

    if (isLoading)
        return (
            <div className="flex h-screen items-center justify-center">
                <Spinner />
            </div>
        );
    if (isError || !user) return <Navigate to="/login" replace />;
    if (requiredRole && user.role !== requiredRole)
        return <Navigate to="/403" replace />;

    return <>{children}</>;
}
```

---

## Security rules

- Never store tokens in localStorage or sessionStorage.
- Never log tokens, passwords, or secrets.
- Always use HTTPS in production (Secure cookie flag).
- Refresh token cookie: HttpOnly + Secure + SameSite=Strict + Path=/api/v1/auth.
- Rotate refresh token on every use (token rotation).
- Revoke all refresh tokens on password change or account deletion.
- Rate-limit login and refresh endpoints (use middleware).
- Validate and sanitize all inputs before processing.
