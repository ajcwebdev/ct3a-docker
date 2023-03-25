# Create T3 App

This is an app bootstrapped according to the [init.tips](https://init.tips) stack, also known as the T3-Stack.

## What's next? How do I make an app with this?

We try to keep this project as simple as possible, so you can start with the most basic configuration and then move on to more advanced configuration.

If you are not familiar with the different technologies used in this project, please refer to the respective docs. If you still are in the wind, please join our [Discord](https://t3.gg/discord) and ask for help.

- [Next-Auth.js](https://next-auth.js.org)
- [Prisma](https://prisma.io)
- [TailwindCSS](https://tailwindcss.com)
- [tRPC](https://trpc.io) (using @next version? [see v10 docs here](https://trpc.io/docs/v10/))

Also checkout these awesome tutorials on `create-t3-app`.

- [Build a Blog With the T3 Stack - tRPC, TypeScript, Next.js, Prisma & Zod](https://www.youtube.com/watch?v=syEWlxVFUrY)
- [Build a Live Chat Application with the T3 Stack - TypeScript, Tailwind, tRPC](https://www.youtube.com/watch?v=dXRRY37MPuk)
- [Build a full stack app with create-t3-app](https://www.nexxel.dev/blog/ct3a-guestbook)
- [A first look at create-t3-app](https://dev.to/ajcwebdev/a-first-look-at-create-t3-app-1i8f)

## Docker Project Configuration

You can containerize this stack and deploy it as a single container using Docker, or as a part of a group of containers using docker-compose. Please note that Next.js requires a different process for build time (available in the frontend, prefixed by `NEXT_PUBLIC`) and runtime environment, server-side only, variables. In this demo we are using two variables:
- `DATABASE_URL` (used by the server)
- `NEXT_PUBLIC_CLIENTVAR` (used by the client)

Pay attention to their positions in the `Dockerfile`, command-line arguments, and `docker-compose.yml`.

### 1. Next Configuration

In your [`next.config.mjs`](https://github.com/t3-oss/create-t3-app/blob/main/cli/template/base/next.config.mjs), add the `standalone` output-option configuration to [reduce image size by automatically leveraging output traces](https://nextjs.org/docs/advanced-features/output-file-tracing):

```diff
// next.config.mjs

export default defineNextConfig({
  reactStrictMode: true,
  swcMinify: true,
+ output: "standalone",
});
```

### 2. Create dockerignore file

Include the following contents in `.dockerignore`:

```
.env
Dockerfile
.dockerignore
node_modules
npm-debug.log
README.md
.next
.git
```

### 3. Create Dockerfile

Include the following contents in `Dockerfile`:

```Dockerfile
# Dockerfile

##### DEPENDENCIES

FROM --platform=linux/amd64 node:16-alpine3.17 AS deps
RUN apk add --no-cache libc6-compat openssl1.1-compat
WORKDIR /app

# Install Prisma Client - remove if not using Prisma
COPY prisma ./

# Install dependencies based on the preferred package manager
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml\* ./

RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then yarn global add pnpm && pnpm i; \
  else echo "Lockfile not found." && exit 1; \
  fi

##### BUILDER

FROM --platform=linux/amd64 node:16-alpine3.17 AS builder
ARG DATABASE_URL
ARG NEXT_PUBLIC_CLIENTVAR
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# ENV NEXT_TELEMETRY_DISABLED 1

RUN \
 if [ -f yarn.lock ]; then SKIP_ENV_VALIDATION=1 yarn build; \
 elif [ -f package-lock.json ]; then SKIP_ENV_VALIDATION=1 npm run build; \
 elif [ -f pnpm-lock.yaml ]; then yarn global add pnpm && SKIP_ENV_VALIDATION=1 pnpm run build; \
 else echo "Lockfile not found." && exit 1; \
 fi

##### RUNNER

FROM --platform=linux/amd64 node:16-alpine3.17 AS runner
WORKDIR /app

ENV NODE_ENV production
# ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/next.config.mjs ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT 3000

CMD ["node", "server.js"]
```

> ***Notes***
> 
> - *Emulation of `--platform=linux/amd64` may not be necessary after moving to Node 18.*
> - *See [`node:alpine`](https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine) to understand why `libc6-compat` might be needed.*
> - *Next.js collects [anonymous telemetry data about general usage](https://nextjs.org/telemetry). Uncomment the first instance of `ENV NEXT_TELEMETRY_DISABLED 1` to disable telemetry during the build. Uncomment the second instance to disable telemetry during runtime.*

## Build and Run Image Locally

Build and run this image locally with the following commands:

```bash
docker build -t ct3a-docker --build-arg NEXT_PUBLIC_CLIENTVAR=clientvar .
docker run -p 3000:3000 -e DATABASE_URL="database_url_goes_here" ct3a-docker
```

Open [localhost:3000](http://localhost:3000/) to see your running application.

## Docker Compose

You can also use Docker Compose to build the image and run the container. Follow steps 1-4 above and create a `docker-compose.yml` file with the following:

```yaml
# docker-compose.yml

version: "3.9"
services:
  app:
    platform: "linux/amd64"
    build:
      context: .
      dockerfile: Dockerfile
      args:
        NEXT_PUBLIC_CLIENTVAR: "clientvar"
    working_dir: /app
    ports:
      - "3000:3000"
    image: t3-app
    environment:
      - DATABASE_URL=database_url_goes_here
```

Run this using the `docker compose up` command:

```bash
docker compose up
```

Open [localhost:3000](http://localhost:3000/) to see your running application.

## Deploy to Railway

You can use a PaaS such as [Railway's](https://railway.app) automated [Dockerfile deployments](https://docs.railway.app/deploy/dockerfiles) to deploy your app. If you have the [Railway CLI installed](https://docs.railway.app/develop/cli#install) you can deploy your app with the following commands:

```bash
railway login
railway init
railway link
railway up
railway open
```

Go to "Variables" and include your `DATABASE_URL`. Then go to "Settings" and select "Generate Domain." To view a running example on Railway, visit [ct3a-docker.up.railway.app](https://ct3a-docker.up.railway.app/).

## Useful Resources

| Resource                             | Link                                                                    |
| ------------------------------------ | ----------------------------------------------------------------------- |
| Dockerfile reference                 | https://docs.docker.com/engine/reference/builder/                       |
| Compose file version 3 reference     | https://docs.docker.com/compose/compose-file/compose-file-v3/           |
| Docker CLI reference                 | https://docs.docker.com/engine/reference/commandline/docker/            |
| Docker Compose CLI reference         | https://docs.docker.com/compose/reference/                              |
| Next.js Deployment with Docker Image | https://nextjs.org/docs/deployment#docker-image                         |
| Next.js in Docker                    | https://benmarte.com/blog/nextjs-in-docker/                             |
| Next.js with Docker Example          | https://github.com/vercel/next.js/tree/canary/examples/with-docker      |
| Create Docker Image of a Next.js app | https://blog.tericcabrel.com/create-docker-image-nextjs-application/    |
