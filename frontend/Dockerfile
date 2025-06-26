FROM nginx:alpine

# Eliminar config default
RUN rm /etc/nginx/conf.d/default.conf

# Copiar configuración
COPY nginx.conf /etc/nginx/conf.d

# Copiar archivos estáticos
COPY . /usr/share/nginx/html

# Asegurar permisos
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

EXPOSE 80 443
