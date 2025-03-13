FROM node:latest

# Install required tools and libraries
RUN apt-get update && apt-get install -y \
    alien \
    libaio1 \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Add Oracle Instant Client ZIP file to the container
ADD ./Oracle-InstantClient-12.1.zip /tmp/

# Extract the ZIP file
RUN unzip /tmp/Oracle-InstantClient-12.1.zip -d /tmp/oracle-client && \
    rm /tmp/Oracle-InstantClient-12.1.zip

# Convert RPM files to DEB and install them
RUN cd /tmp/oracle-client && \
    alien -i oracle-instantclient12.1-basic-12.1.0.2.0-1.x86_64.rpm && \
    alien -i oracle-instantclient12.1-devel-12.1.0.2.0-1.x86_64.rpm && \
    alien -i oracle-instantclient12.1-sqlplus-12.1.0.2.0-1.x86_64.rpm && \
    rm -rf /tmp/oracle-client

RUN npm install -g pnpm
WORKDIR /app
COPY package*.json .
RUN pnpm install
COPY . .
RUN pnpm build
CMD ["pnpm", "run", "start:dev"]