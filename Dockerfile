FROM node:18 AS build
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install --omit=dev
COPY ./ ./

FROM node:18-slim AS runtime
WORKDIR /app
RUN groupadd --system nodegroup && useradd --system --create-home --gid nodegroup nodeuser
COPY --from=build /usr/src/app .
RUN chown -R nodeuser:nodegroup /app
USER nodeuser
EXPOSE 5001
CMD ["npm", "start"]