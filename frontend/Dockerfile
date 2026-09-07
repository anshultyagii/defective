FROM node:20-alpine

WORKDIR /app

# Copy dependency specifications
COPY package*.json ./
RUN npm install

# Copy frontend source code
COPY . .

EXPOSE 5173

CMD ["npx", "vite", "--host", "0.0.0.0", "--port", "5173"]
