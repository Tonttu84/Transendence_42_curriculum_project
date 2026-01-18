FROM node:25-alpine

WORKDIR /usr/src/app

ENV CI=true

RUN mkdir -p /usr/src/app/data
RUN chmod 777 /usr/src/app/data

COPY --chown=node:node . .

RUN npm install -g pnpm

RUN pnpm install --frozen-lockfile
RUN pnpm build
RUN pnpm prune --prod

# EXPOSE 3003 done in the docker-compose, only noted here for information

USER node

CMD ["pnpm", "start"]