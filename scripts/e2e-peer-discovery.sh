#!/usr/bin/env bash
set -euo pipefail

NAMESPACE="nogoo9"
DEPLOYMENT="nogoo-mcp"
SECRET_NAME="nogoo9-session-key"

echo "=== Starting E2E Peer Discovery Session Key Sharing Test ==="

# 1. Delete the existing session secret to force peer-to-peer negotiation
echo "1. Deleting Kubernetes Secret '$SECRET_NAME' (if exists)..."
kubectl delete secret "$SECRET_NAME" -n "$NAMESPACE" --ignore-not-found

# 2. Restart deployment to boot replicas simultaneously
echo "2. Restarting deployment '$DEPLOYMENT' to trigger simultaneous boot..."
kubectl rollout restart deployment/"$DEPLOYMENT" -n "$NAMESPACE"

# 3. Wait for the rollout to complete successfully
echo "3. Waiting for deployment rollout to complete..."
kubectl rollout status deployment/"$DEPLOYMENT" -n "$NAMESPACE" --timeout=90s

# 4. Get the active pods (excluding terminating ones)
echo "4. Retrieving running pod names..."
ALL_PODS=$(kubectl get pods -n "$NAMESPACE" -l app=nogoo9-mcp -o jsonpath='{.items[*].metadata.name}')

POD_ARRAY=()
for pod in $ALL_PODS; do
  DEL_TIME=$(kubectl get pod "$pod" -n "$NAMESPACE" -o jsonpath='{.metadata.deletionTimestamp}')
  if [ -z "$DEL_TIME" ]; then
    POD_ARRAY+=("$pod")
  fi
done

if [ ${#POD_ARRAY[@]} -lt 2 ]; then
  echo "Error: Expected at least 2 active replica pods, found ${#POD_ARRAY[@]}."
  exit 1
fi

echo "Found ${#POD_ARRAY[@]} active replica pods:"
for pod in "${POD_ARRAY[@]}"; do
  echo "  - $pod"
done

# 5. Extract the session key from each pod
echo "5. Querying the session key from each pod..."
KEYS=()
for pod in "${POD_ARRAY[@]}"; do
  echo "Querying key from pod: $pod..."
  
  # Execute node command inside the pod to query /internal/session-key
  # We try node first, then bun, fallback to empty string output (|| true)
  KEY_JSON=$(kubectl exec "$pod" -n "$NAMESPACE" -- node -e "
    fetch('http://localhost:3000/internal/session-key', {
      headers: { 'X-Nogoo9-Internal': '$NAMESPACE' }
    })
    .then(res => {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(data => console.log(JSON.stringify(data)))
    .catch(err => {
      console.error(err.message);
      process.exit(1);
    });
  " 2>/dev/null || kubectl exec "$pod" -n "$NAMESPACE" -- bun -e "
    fetch('http://localhost:3000/internal/session-key', {
      headers: { 'X-Nogoo9-Internal': '$NAMESPACE' }
    })
    .then(res => {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(data => console.log(JSON.stringify(data)))
    .catch(err => {
      console.error(err.message);
      process.exit(1);
    });
  " 2>/dev/null || true)

  if [ -z "$KEY_JSON" ]; then
    echo "Error: Failed to fetch session key from pod '$pod'"
    exit 1
  fi

  # Parse the key value
  KEY=$(echo "$KEY_JSON" | grep -o '"key":"[^"]*' | grep -o '[^"]*$')
  echo "  Key: $KEY"
  KEYS+=("$KEY")
done

# 6. Verify that all keys are identical
echo "6. Verifying keys are identical across all replicas..."
FIRST_KEY="${KEYS[0]}"
MISMATCH=0
for i in "${!KEYS[@]}"; do
  if [ "${KEYS[$i]}" != "$FIRST_KEY" ]; then
    echo "FAIL: Pod '${POD_ARRAY[$i]}' has key '${KEYS[$i]}', which does not match first pod's key '$FIRST_KEY'."
    MISMATCH=1
  fi
done

if [ $MISMATCH -eq 0 ]; then
  echo "=== SUCCESS: All replicas successfully negotiated and shared the exact same session key! ==="
  exit 0
else
  echo "=== FAILURE: Mismatch in negotiated session keys across replicas! ==="
  exit 1
fi
