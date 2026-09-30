# Manuella & Joseph Restaurant Platform

A Kubernetes-ready restaurant microservice platform packaged with Helm.

This project is intentionally built for DevOps practice. It gives you one polished Manuella & Joseph restaurant application plus a fleet of internal services that are deployed, discovered, and routed inside Kubernetes.

## Services

The Helm chart deploys 11 services:

| Service | Purpose |
| --- | --- |
| `gateway` | Serves the web UI and proxies browser API calls to internal services |
| `menu` | Menu categories, dishes, prices, and availability |
| `orders` | Recent restaurant orders |
| `reservations` | Upcoming table reservations |
| `tables` | Dining room table status |
| `kitchen` | Kitchen stations and ticket queue |
| `inventory` | Ingredients and stock levels |
| `payments` | Payment summaries and settlement status |
| `loyalty` | Guest loyalty profiles |
| `notifications` | Guest notification events |
| `reviews` | Guest reviews and ratings |

## Local Run

Run the gateway and point it at local service processes if you want to test outside Kubernetes. For the main DevOps workflow, build the image and deploy with Helm.

For a quick local UI demo:

```bash
SERVICE_NAME=gateway PORT=8080 node src/server.js
```

On Windows PowerShell:

```powershell
$env:SERVICE_NAME="gateway"; $env:PORT="8080"; node src/server.js
```

The gateway includes an in-memory fallback so the website remains dynamic even when the other services are not running locally.

## Dynamic Features

The website now supports:

- Adding menu items to a cart
- Creating new table orders
- Creating new reservations
- Adding new guest reviews
- Filtering dining room tables
- Advancing the kitchen workflow
- Auto-refreshing service data every 30 seconds

The training app stores changes in memory. In Kubernetes, each service owns its own runtime state, so restarting a Pod resets that service back to its bundled demo data. That is intentional for this lab because the next natural DevOps step is adding a database or message broker.

## Write The Dockerfile

Create a file named `Dockerfile` in the `restaurant-platform` folder:

```Dockerfile
FROM node:22-alpine

WORKDIR /app

COPY package.json ./
COPY src ./src

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "src/server.js"]
```

What each line does:

| Dockerfile line | Purpose |
| --- | --- |
| `FROM node:22-alpine` | Starts from a lightweight Node.js image |
| `WORKDIR /app` | Sets `/app` as the working directory inside the container |
| `COPY package.json ./` | Copies the project metadata into the image |
| `COPY src ./src` | Copies the application source code into the image |
| `ENV NODE_ENV=production` | Runs the app in production mode |
| `ENV PORT=8080` | Sets the port the Node.js app listens on |
| `EXPOSE 8080` | Documents that the container uses port `8080` |
| `CMD ["node", "src/server.js"]` | Starts the application when the container runs |

The same Docker image is used for all microservices. Each container becomes a different service by changing the `SERVICE_NAME` environment variable.

## Build Image

From this folder:

```bash
docker build -t restaurant-platform:0.1.0 .
```

For a real cluster, tag and push the image to your registry:

```bash
docker tag restaurant-platform:0.1.0 <registry>/restaurant-platform:0.1.0
docker push <registry>/restaurant-platform:0.1.0
```

Then update `helm/restaurant-platform/values.yaml`:

```yaml
image:
  repository: <registry>/restaurant-platform
  tag: "0.1.0"
```

## Deploy With Helm

```bash
helm upgrade --install restaurant-platform ./helm/restaurant-platform \
  --namespace restaurant \
  --create-namespace
```

Check the workloads:

```bash
kubectl get pods,svc -n restaurant
```

## Access The App

Port-forward the gateway:

```bash
kubectl port-forward svc/restaurant-platform-gateway 8080:80 -n restaurant
```

Open:

```text
http://localhost:8080
```

## Enable Ingress

Set this in `helm/restaurant-platform/values.yaml`:

```yaml
ingress:
  enabled: true
  className: nginx
  hosts:
    - host: restaurant.local
      paths:
        - path: /
          pathType: Prefix
```

Then install or upgrade the chart again.

## Useful Helm Commands

Render templates without installing:

```bash
helm template restaurant-platform ./helm/restaurant-platform
```

Validate chart structure:

```bash
helm lint ./helm/restaurant-platform
```

Uninstall:

```bash
helm uninstall restaurant-platform -n restaurant
```
