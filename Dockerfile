FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

# Clave pública de analytics: Astro la incrusta en el HTML durante el build.
ARG PUBLIC_ANALYTICS_KEY=""
RUN PUBLIC_ANALYTICS_KEY="$PUBLIC_ANALYTICS_KEY" npm run build

ENV HOST=0.0.0.0
ENV PORT=4321

EXPOSE 4321

CMD ["node", "./dist/server/entry.mjs"]
