#!/bin/bash
set -e

echo "Building local Docker image..."
docker build -t atomos-showcase:latest .

echo "Exporting Docker image..."
docker save atomos-showcase:latest > atomos-showcase.tar

echo "Transferring image to server via SSH..."
scp atomos-showcase.tar tadeo@192.168.1.10:/tmp/
scp -r k8s/ tadeo@192.168.1.10:/tmp/

echo "Importing image into K3s..."
ssh tadeo@192.168.1.10 "sudo k3s ctr images import /tmp/atomos-showcase.tar"

echo "Applying K8s manifests..."
ssh tadeo@192.168.1.10 "sudo k3s kubectl apply -f /tmp/k8s/"

echo "Verifying rollout..."
ssh tadeo@192.168.1.10 "sudo k3s kubectl rollout status deployment/atomos-showcase"

echo "Cleanup..."
ssh tadeo@192.168.1.10 "rm -rf /tmp/atomos-showcase.tar /tmp/k8s"
rm atomos-showcase.tar

echo "Deployment successful!"
