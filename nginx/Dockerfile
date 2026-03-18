FROM nginx:1.25-alpine
RUN apk add --no-cache openssl && \
    mkdir -p /etc/nginx/certs && \
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
      -keyout /etc/nginx/certs/key.pem \
      -out    /etc/nginx/certs/cert.pem \
      -subj "/C=TH/ST=ChiangMai/L=ChiangMai/O=RMUTL/OU=ENGSE207/CN=localhost"
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]
