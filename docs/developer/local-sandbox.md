# Local Sandbox (k3d & Keycloak)

This guide covers setting up a local development sandbox using `k3d` (a lightweight wrapper to run k3s in Docker) and a containerized Keycloak SSO instance to test OIDC authentication and reverse proxy routing.

---

## ☸️ 1. Bootstrapping the local k3d cluster

The repository includes helper scripts to provision a local cluster with a built-in container registry and Keycloak:

### 🚀 Automatic Setup
The easiest way to bootstrap the cluster is using the Moon task runner:
```bash
# Spin up cluster, local registry, and deploy manifests
moon run k3d:setup
```

This runs the script located in [infra/k3d/bootstrap.sh](file:///home/eterna2/github/nogoo9-no-crd/infra/k3d/bootstrap.sh) which:
1. Creates a local registry named `k3d-registry.localhost` on port `5001`.
2. Spins up a `k3d` cluster named `nogoo9`.
3. Deploys the namespace `nogoo9` and binds the required RBAC ClusterRoles/Roles.
4. Spins up a containerized Keycloak SSO service in the namespace `security`.

---

## 🔑 2. Testing OIDC Auth Locally

The local Keycloak instance is preconfigured with:
- **Issuer URL**: `http://localhost:8080/auth/realms/nogoo9`
- **PKCE Client ID**: `nogoo9-public-client`
- **Redirect URI**: `http://localhost:3000/*` (matches the local MCP dashboard port)

### Default Test Credentials
Use the following accounts to validate roles and access hierarchies inside the local dashboard:

| Username | Password | Assigned Roles |
|---|---|---|
| `adminuser` | `admin` | `admin` |
| `writeuser` | `user` | `user` |
| `readuser` | `viewer` | `viewer` |

### Testing Endpoint Access
Verify SSO logins by accessing:
`http://localhost:3000/`

For detailed client scopes configuration and custom role-claim mapping, see the [SSO & OIDC Authentication Guide](../deploy/sso-identity.md).
