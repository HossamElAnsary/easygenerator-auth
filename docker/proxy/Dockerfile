# The front proxy (Architecture A02, A12): the same-host reverse proxy in front
# of the API's loopback listener, over HTTP for the local preview.
FROM nginxinc/nginx-unprivileged:1.30.6-alpine@sha256:f5116ed4606f3eb015dd4a8e28cb9b351476dc0ad4bc6e9f93b19cec130cdf03

COPY docker/proxy/default.conf /etc/nginx/conf.d/default.conf
