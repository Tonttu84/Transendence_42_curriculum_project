FROM node:25-alpine

WORKDIR /usr/src/app

ENV CI=true


RUN npm install -g pnpm


RUN mkdir -p db
RUN chown -R node:node /usr/src/app


COPY --chown=node:node . .


USER node


RUN pnpm install --frozen-lockfile
RUN pnpm build
RUN pnpm prune --prod

CMD ["pnpm", "start"]
