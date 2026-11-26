# Production image for the client: build the static site, then serve it with nginx.
FROM node:22-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci

# Vite bakes these into the build, so they are build arguments, not runtime settings.
ARG VITE_BASEURL
ARG VITE_SUCCESS_URL
ARG VITE_STRIPE_PUBLISHABLE_KEY
ARG VITE_CLOUDINARY_CLOUD_NAME
ARG VITE_CLOUDINARY_UPLOAD_PRESET
ARG VITE_CONTACT_EMAIL
ENV VITE_BASEURL=$VITE_BASEURL \
    VITE_SUCCESS_URL=$VITE_SUCCESS_URL \
    VITE_STRIPE_PUBLISHABLE_KEY=$VITE_STRIPE_PUBLISHABLE_KEY \
    VITE_CLOUDINARY_CLOUD_NAME=$VITE_CLOUDINARY_CLOUD_NAME \
    VITE_CLOUDINARY_UPLOAD_PRESET=$VITE_CLOUDINARY_UPLOAD_PRESET \
    VITE_CONTACT_EMAIL=$VITE_CONTACT_EMAIL

COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
