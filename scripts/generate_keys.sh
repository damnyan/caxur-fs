#!/bin/bash

# Generate ES256 (ECDSA P-256) key pair for JWT authentication
# This script generates a private and public key pair and outputs them for your .env file

set -e

echo "Generating ES256 key pair..."

# Generate private key (EC prime256v1 is the P-256 curve)
PRIVATE_KEY_SEC1=$(openssl ecparam -name prime256v1 -genkey -noout)

# Convert to PKCS#8 format required by jsonwebtoken crate
PRIVATE_KEY=$(echo "$PRIVATE_KEY_SEC1" | openssl pkcs8 -topk8 -nocrypt)

# Extract public key from private key
PUBLIC_KEY=$(echo "$PRIVATE_KEY_SEC1" | openssl ec -pubout 2>/dev/null)

echo "✓ Keys generated successfully!"
echo ""
echo "Add these to your .env file:"
echo ""
PRIVATE_KEY_VALUE=$(echo "$PRIVATE_KEY" | awk '{printf "%s\\n", $0}')
PUBLIC_KEY_VALUE=$(echo "$PUBLIC_KEY" | awk '{printf "%s\\n", $0}')
echo "JWT_PRIVATE_KEY=\"$PRIVATE_KEY_VALUE\""
echo "JWT_PUBLIC_KEY=\"$PUBLIC_KEY_VALUE\""
echo "JWT_ACCESS_TOKEN_EXPIRY=900"
echo "JWT_REFRESH_TOKEN_EXPIRY=604800"
echo ""
