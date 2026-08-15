#!/bin/bash
set -e

echo "Building local Docker image..."
docker build -t atomos-showcase:latest .

echo "Exporting Docker image..."
docker save atomos-showcase:latest > atomos-showcase.tar

echo "Transferring image to server via SSH..."
scp atomos-showcase.tar tadeo@192.168.1.10:/tmp/
scp -r k8s/ tadeo@192.168.1.10:/tmp/

echo "Deploying on server..."
ssh tadeo@192.168.1.10 '
  if command -v k3s >/dev/null 2>&1; then
    echo "Importing image into K3s..."
    sudo k3s ctr images import /tmp/atomos-showcase.tar
    echo "Applying K8s manifests..."
    sudo k3s kubectl apply -f /tmp/k8s/
    echo "Verifying rollout..."
    sudo k3s kubectl rollout status deployment/atomos-showcase
  else
    echo "K3s CLI not found in PATH, deploying via Docker container runtime..."
    sudo docker load -i /tmp/atomos-showcase.tar
    if sudo docker ps -a --format "{{.Names}}" | grep -q "^structura-showcase$"; then
      sudo docker stop structura-showcase
      sudo docker rm structura-showcase
    fi
    sudo docker run -d --name structura-showcase --restart unless-stopped -p 3005:3000 atomos-showcase:latest
    echo "Verifying container..."
    sudo docker ps -f name=structura-showcase
  fi
  rm -rf /tmp/atomos-showcase.tar /tmp/k8s
'

echo "Cleanup local archive..."
rm -f atomos-showcase.tar

echo "Deployment successful!"
