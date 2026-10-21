# The local single-node replica set (Architecture A08, A12). MongoDB 8.0 refuses
# to start on Linux kernels 6.19 through 7.0.13 (SERVER-121912); 7.0 does not.
FROM mongo:7.0.45@sha256:c53852c00c23ca9f23fc39690350ffa9a80e3642fe8f96879726d8da0abe80a7

# Copied rather than bind-mounted, so starting Compose from another checkout
# never recreates the shared container with that checkout's files.
COPY scripts/mongo-init.js docker/mongodb/wait-and-init.js /opt/easy-generator/

CMD ["mongod", "--replSet", "easy-generator-rs", "--bind_ip_all", "--port", "27018"]
