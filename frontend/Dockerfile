FROM nginx:alpine

# Elimina la configuración por defecto
RUN rm /etc/nginx/conf.d/default.conf

# Copia tu configuración personalizada
COPY nginx.conf /etc/nginx/conf.d

# Copia los archivos estáticos
COPY . /usr/share/nginx/html

EXPOSE 80 443
