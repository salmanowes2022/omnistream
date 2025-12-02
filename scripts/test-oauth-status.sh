#!/bin/bash

# Test script to check OAuth status for a community
# Usage: ./test-oauth-status.sh <communityId>

COMMUNITY_ID=$1
API_URL="http://localhost:3000"

if [ -z "$COMMUNITY_ID" ]; then
    echo "Usage: ./test-oauth-status.sh <communityId>"
    exit 1
fi

echo "Testing OAuth status for community: $COMMUNITY_ID"
echo ""

echo "Checking YouTube status:"
curl -s "${API_URL}/api/v1/auth/youtube/status?communityId=${COMMUNITY_ID}" | jq .
echo ""

echo "Checking Facebook status:"
curl -s "${API_URL}/api/v1/auth/facebook/status?communityId=${COMMUNITY_ID}" | jq .
echo ""

echo "Checking TikTok status:"
curl -s "${API_URL}/api/v1/auth/tiktok/status?communityId=${COMMUNITY_ID}" | jq .
