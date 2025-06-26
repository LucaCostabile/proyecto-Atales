FROM nginx:alpine

# Elimina la configuración por defecto (esto ya lo tienes)
RUN rm /etc/nginx/conf.d/default.conf

# Copia TU configuración de Nginx al directorio correcto
COPY nginx.conf /etc/nginx/conf.d/default.conf  # ¡Asegúrate de que la ruta sea exactamente esta!

# Copia los archivos estáticos (esto ya lo tienes)
COPY . /usr/share/nginx/html

EXPOSE 80 443
