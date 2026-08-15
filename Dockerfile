FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY src ./src
COPY miner.yaml tsconfig.json ./
ENV NODE_ENV=production
EXPOSE 8080
USER node
CMD ["npm", "start"]
