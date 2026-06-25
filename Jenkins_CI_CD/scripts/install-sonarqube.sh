#!/bin/bash
# ============================================================
#  FutureKawa — Installation SonarQube Community Edition
#
#  Ce script installe automatiquement :
#   - PostgreSQL
#   - SonarQube Community Edition
#
#  SonarQube sera utilisé par Jenkins afin d'analyser
#  la qualité du code du projet FutureKawa.
#
#  Utilisation :
#      bash Jenkins_CI_CD/scripts/install-sonarqube.sh
#
#  Auteur : FutureKawa DevOps
# ============================================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo "╔════════════════════════════════════════════════════╗"
echo "║      FutureKawa - Installation SonarQube          ║"
echo "╚════════════════════════════════════════════════════╝"
echo ""

# ============================================================
# Vérification Docker
# ============================================================

echo -e "${YELLOW}[1/7] Vérification de Docker...${NC}"

if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Docker Desktop n'est pas lancé.${NC}"
    exit 1
fi

echo -e "${GREEN}Docker est disponible.${NC}"
echo ""

# ============================================================
# Création du réseau Docker
# ============================================================

echo -e "${YELLOW}[2/7] Vérification du réseau Docker...${NC}"

docker network create futurekawa-jenkins 2>/dev/null || true

echo -e "${GREEN}Réseau Docker prêt.${NC}"
echo ""

# ============================================================
# Création des volumes
# ============================================================

echo -e "${YELLOW}[3/7] Création des volumes SonarQube...${NC}"

docker volume create sonarqube_data > /dev/null
docker volume create sonarqube_logs > /dev/null
docker volume create sonarqube_extensions > /dev/null
docker volume create sonarqube_postgres > /dev/null

echo -e "${GREEN}Volumes créés.${NC}"
echo ""

# ============================================================
# PostgreSQL
# ============================================================

echo -e "${YELLOW}[4/7] Lancement PostgreSQL...${NC}"

docker rm -f sonarqube-db 2>/dev/null || true

docker run -d \
    --name sonarqube-db \
    --restart unless-stopped \
    --network futurekawa-jenkins \
    -e POSTGRES_USER=sonar \
    -e POSTGRES_PASSWORD=sonar \
    -e POSTGRES_DB=sonarqube \
    -v sonarqube_postgres:/var/lib/postgresql/data \
    postgres:15

echo "Attente de PostgreSQL..."
sleep 10

echo -e "${GREEN}PostgreSQL prêt.${NC}"
echo ""

# ============================================================
# SonarQube
# ============================================================

echo -e "${YELLOW}[5/7] Lancement SonarQube...${NC}"

docker rm -f sonarqube 2>/dev/null || true

docker run -d \
    --name sonarqube \
    --restart unless-stopped \
    --network futurekawa-jenkins \
    -p 9000:9000 \
    -e SONAR_JDBC_URL=jdbc:postgresql://sonarqube-db:5432/sonarqube \
    -e SONAR_JDBC_USERNAME=sonar \
    -e SONAR_JDBC_PASSWORD=sonar \
    -v sonarqube_data:/opt/sonarqube/data \
    -v sonarqube_logs:/opt/sonarqube/logs \
    -v sonarqube_extensions:/opt/sonarqube/extensions \
    sonarqube:community

echo ""

echo -e "${YELLOW}[6/7] Attente du démarrage de SonarQube...${NC}"

MAX=36
COUNT=0

until curl -sf http://localhost:9000/api/system/status 2>/dev/null | grep -q '"status":"UP"' || [ $COUNT -eq $MAX ]; do
    echo "Démarrage... ($((COUNT*5)) secondes)"
    sleep 5
    COUNT=$((COUNT+1))
done

echo ""

STATUS=$(curl -sf http://localhost:9000/api/system/status 2>/dev/null || echo '{}')

if echo "$STATUS" | grep -q '"status":"UP"'; then
    echo -e "${GREEN}SonarQube est opérationnel.${NC}"
else
    echo -e "${YELLOW}SonarQube démarre encore. Attendez encore quelques instants.${NC}"
fi

echo ""

# ============================================================
# Informations finales
# ============================================================

echo -e "${BLUE}[7/7] Installation terminée.${NC}"
echo ""

echo "=========================================================="
echo "                SonarQube FutureKawa"
echo "=========================================================="
echo ""
echo "URL :"
echo "http://localhost:9000"
echo ""
echo "Utilisateur : admin"
echo "Mot de passe : admin"
echo ""
echo "Au premier démarrage :"
echo "  1. Se connecter"
echo "  2. Changer le mot de passe"
echo "  3. Créer un projet : futurekawa-backend-central"
echo "  4. Générer un Token"
echo "  5. Ajouter ce Token dans Jenkins"
echo ""
echo "Logs :"
echo "docker logs -f sonarqube"
echo ""
echo "Arrêter SonarQube :"
echo "docker stop sonarqube"
echo ""
echo "Relancer SonarQube :"
echo "docker start sonarqube"
echo ""
echo "=========================================================="