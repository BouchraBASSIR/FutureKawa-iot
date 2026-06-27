FROM jenkins/jenkins:lts-jdk17

USER root

ARG DOCKER_COMPOSE_VERSION=v2.29.7

RUN apt-get update && apt-get install -y \
    python3 \
    python3-venv \
    python3-pip \
    build-essential \
    libpq-dev \
    docker.io \
    curl \
    unzip \
    default-jre \
    && mkdir -p /usr/local/lib/docker/cli-plugins \
    && curl -SL "https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-linux-x86_64" \
        -o /usr/local/lib/docker/cli-plugins/docker-compose \
    && chmod +x /usr/local/lib/docker/cli-plugins/docker-compose \
    && curl -sSLo /tmp/sonar-scanner.zip https://binaries.sonarsource.com/Distribution/sonar-scanner-cli/sonar-scanner-cli-6.2.1.4610-linux-x64.zip \
    && unzip /tmp/sonar-scanner.zip -d /opt \
    && mv /opt/sonar-scanner-6.2.1.4610-linux-x64 /opt/sonar-scanner \
    && ln -s /opt/sonar-scanner/bin/sonar-scanner /usr/local/bin/sonar-scanner \
    && rm /tmp/sonar-scanner.zip \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

USER jenkins