#!/bin/bash
# ============================================================
#  FutureKawa — Installation Jenkins en local avec Docker CLI
#
#  Ce script installe Jenkins dans un conteneur Docker.
#  Jenkins pourra ensuite executer :
#  - docker build
#  - docker push
#  - docker compose
#
#  Usage : bash Jenkins_CI_CD/scripts/install-jenkins.sh
#
#  Prerequis : Docker Desktop lance
# ============================================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║   FutureKawa — Installation Jenkins Docker CLI   ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

echo -e "${YELLOW}[0] Verification de Docker...${NC}"
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Docker n'est pas lance. Lance Docker Desktop d'abord.${NC}"
    exit 1
fi
echo -e "${GREEN}Docker est disponible${NC}"
echo ""

echo -e "${YELLOW}[1] Creation du reseau Docker partage...${NC}"
docker network create futurekawa-jenkins 2>/dev/null || echo "  Reseau existe deja"
echo -e "${GREEN}Reseau futurekawa-jenkins OK${NC}"
echo ""

echo -e "${YELLOW}[2] Creation du volume Jenkins...${NC}"
docker volume create jenkins-data 2>/dev/null || echo "  Volume existe deja"
echo -e "${GREEN}Volume jenkins-data OK${NC}"
echo ""

echo -e "${YELLOW}[3] Construction de l'image Jenkins avec Docker CLI...${NC}"

TMPDIR_BUILD=$(mktemp -d)

cat > "${TMPDIR_BUILD}/Dockerfile" <<'DOCKERFILE'
FROM jenkins/jenkins:lts

USER root

# Installation des outils necessaires + Docker CLI + Docker Compose plugin
RUN apt-get update && \
    apt-get install -y ca-certificates curl gnupg lsb-release && \
    install -m 0755 -d /etc/apt/keyrings && \
    curl -fsSL https://download.docker.com/linux/debian/gpg \
        | gpg --dearmor -o /etc/apt/keyrings/docker.gpg && \
    chmod a+r /etc/apt/keyrings/docker.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
      https://download.docker.com/linux/debian \
      $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
      > /etc/apt/sources.list.d/docker.list && \
    apt-get update && \
    apt-get install -y docker-ce-cli docker-compose-plugin && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Autoriser l'utilisateur jenkins a utiliser Docker
RUN groupadd -f docker && usermod -aG docker jenkins

USER jenkins
DOCKERFILE

docker build -t jenkins-futurekawa:local "${TMPDIR_BUILD}"
rm -rf "${TMPDIR_BUILD}"

echo -e "${GREEN}Image jenkins-futurekawa:local construite${NC}"
echo ""

echo -e "${YELLOW}[4] Lancement du conteneur Jenkins...${NC}"

docker rm -f jenkins-futurekawa 2>/dev/null || true
docker rm -f futurekawa-jenkins 2>/dev/null || true

docker run -d \
    --name jenkins-futurekawa \
    --restart unless-stopped \
    -p 8081:8080 \
    -p 50000:50000 \
    -v jenkins-data:/var/jenkins_home \
    -v /var/run/docker.sock:/var/run/docker.sock \
    --network futurekawa-jenkins \
    jenkins-futurekawa:local

echo -e "${GREEN}Jenkins demarre${NC}"
echo ""

echo -e "${YELLOW}[5] Attente du demarrage de Jenkins...${NC}"
MAX=30
COUNT=0

until curl -sf http://localhost:8081/login > /dev/null 2>&1 || [ $COUNT -eq $MAX ]; do
    echo "  Demarrage en cours... ($((COUNT*5))s)"
    sleep 5
    COUNT=$((COUNT+1))
done

if ! curl -sf http://localhost:8081/login > /dev/null 2>&1; then
    echo -e "${RED}Jenkins ne demarre pas. Verifie : docker logs jenkins-futurekawa${NC}"
    exit 1
fi

echo -e "${GREEN}Jenkins est en ligne sur http://localhost:8081${NC}"
echo ""

echo -e "${YELLOW}[6] Verification Docker CLI dans Jenkins...${NC}"

if docker exec jenkins-futurekawa docker version > /dev/null 2>&1; then
    echo -e "${GREEN}Docker CLI fonctionne dans Jenkins${NC}"
else
    echo -e "${RED}Docker CLI ne fonctionne pas dans Jenkins${NC}"
    echo "Verifie le montage du socket Docker : /var/run/docker.sock"
fi

echo ""

echo -e "${YELLOW}[7] Verification Docker Compose dans Jenkins...${NC}"

if docker exec jenkins-futurekawa docker compose version > /dev/null 2>&1; then
    echo -e "${GREEN}Docker Compose fonctionne dans Jenkins${NC}"
else
    echo -e "${RED}Docker Compose ne fonctionne pas dans Jenkins${NC}"
fi

echo ""

echo -e "${YELLOW}[8] Recuperation du mot de passe administrateur initial...${NC}"
sleep 5

INITIAL_PWD=$(docker exec jenkins-futurekawa \
    cat /var/jenkins_home/secrets/initialAdminPassword 2>/dev/null || echo "Pas encore disponible")

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Jenkins est installe et pret                   ║${NC}"
echo -e "${BLUE}║                                                  ║${NC}"
echo -e "${BLUE}║  URL      : http://localhost:8081                ║${NC}"
echo -e "${BLUE}║  Password : ${INITIAL_PWD}                       ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════╝${NC}"
echo ""
echo "Commandes utiles :"
echo "  docker start jenkins-futurekawa"
echo "  docker logs -f jenkins-futurekawa"
echo "  docker exec jenkins-futurekawa docker version"
echo "  docker exec jenkins-futurekawa docker compose version"