pipeline {

    // =========================================================
    // Agent Jenkins utilisé pour exécuter le pipeline
    // =========================================================
    agent any

    // =========================================================
    // Variables globales du pipeline
    // =========================================================
    environment {

        // Nom de l'image Docker du backend central
        IMAGE_NAME = "futurekawa-backend-central"

        // Version de l'image Docker
        IMAGE_TAG = "latest"

        // Dépôt Docker Hub
        DOCKERHUB_REPO = "z24ch/futurekawa-backend-central"

        // Token SonarQube stocké dans Jenkins Credentials
        SONAR_TOKEN = credentials('sonarqube-token')
    }

    stages {

        // =====================================================
        // STAGE 1 : Récupération du code source depuis GitHub
        // =====================================================
        stage('1 - Checkout') {
            steps {
                echo 'Recuperation du code source FutureKawa'
                checkout scm
            }
        }

        // =====================================================
        // STAGE 2 : Vérification de la structure du backend central
        // =====================================================
        stage('2 - Verification structure backend central') {
            steps {
                sh '''
                    echo "Verification des fichiers backend-central..."

                    test -f backend-central/src/main.py
                    test -f backend-central/src/config.py
                    test -f backend-central/src/requirements.txt
                    test -f backend-central/Dockerfile

                    test -d backend-central/tests/Unit
                    test -d backend-central/tests/Integration

                    test -f backend-central/tests/Unit/test_backend_central_unit.py
                    test -f backend-central/tests/Integration/test_backend_central_integration.py

                    echo "Structure backend-central OK"
                '''
            }
        }

        // =====================================================
        // STAGE 3 : Création de l'environnement virtuel Python
        // et installation des dépendances
        // =====================================================
        stage('3 - Installation dependances') {
            steps {
                sh '''
                    cd backend-central

                    # Suppression de l'ancien environnement virtuel
                    rm -rf .venv

                    # Création d'un nouvel environnement virtuel
                    python -m venv .venv

                    # Activation
                    . .venv/bin/activate

                    # Mise à jour de pip
                    python -m pip install --upgrade pip

                    # Installation des dépendances du projet
                    pip install -r src/requirements.txt

                    # Installation des outils CI/CD
                    pip install pytest pytest-html pytest-cov pytest-asyncio flake8
                '''
            }
        }

        // =====================================================
        // STAGE 4 : Analyse statique du code avec Flake8
        // =====================================================
        stage('4 - Lint backend central') {
            steps {
                sh '''
                    cd backend-central
                    . .venv/bin/activate

                    flake8 src tests \
                    --max-line-length=120 \
                    --exit-zero \
                    --format=default \
                    --output-file=flake8-backend-central.txt
                '''
            }
        }

        // =====================================================
        // STAGE 5 : Tests unitaires + rapport HTML + coverage
        // =====================================================
        stage('5 - Tests unitaires backend central') {
            steps {
                sh '''
                    cd backend-central
                    . .venv/bin/activate

                    pytest tests/Unit/ \
                    --html=backend-central-unit-report.html \
                    --self-contained-html \
                    --cov=src \
                    --cov-report=xml:coverage-backend-central.xml \
                    --cov-report=term
                '''
            }
        }

        // =====================================================
        // STAGE 6 : Tests d'intégration
        // =====================================================
        stage('6 - Tests integration backend central') {
            steps {
                sh '''
                    cd backend-central
                    . .venv/bin/activate

                    pytest tests/Integration/ \
                    --html=backend-central-integration-report.html \
                    --self-contained-html
                '''
            }
        }

        // =====================================================
        // STAGE 7 : Analyse SonarQube
        // =====================================================
        stage('7 - SonarQube backend central') {
            steps {
                sh '''
                    cd backend-central

                    sonar-scanner \
                    -Dsonar.projectKey=futurekawa-backend-central \
                    -Dsonar.projectName="FutureKawa Backend Central" \
                    -Dsonar.sources=src \
                    -Dsonar.tests=tests \
                    -Dsonar.python.coverage.reportPaths=coverage-backend-central.xml \
                    -Dsonar.host.url=http://sonarqube:9000 \
                    -Dsonar.token=$SONAR_TOKEN
                '''
            }
        }

        // =====================================================
        // STAGE 8 : Construction de l'image Docker
        // =====================================================
        stage('8 - Build Docker backend central') {
            steps {
                sh '''
                    docker build \
                    -t ${IMAGE_NAME}:${IMAGE_TAG} \
                    -t ${DOCKERHUB_REPO}:${IMAGE_TAG} \
                    backend-central
                '''
            }
        }

        // =====================================================
        // STAGE 9 : Publication de l'image sur Docker Hub
        // =====================================================
        stage('9 - Push Docker Hub') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'dockerhub',
                    usernameVariable: 'DOCKERHUB_USERNAME',
                    passwordVariable: 'DOCKERHUB_PASSWORD'
                )]) {
                    sh '''
                        echo "$DOCKERHUB_PASSWORD" | docker login -u "$DOCKERHUB_USERNAME" --password-stdin
                        docker push ${DOCKERHUB_REPO}:${IMAGE_TAG}
                    '''
                }
            }
        }

        // =====================================================
        // STAGE 10 : Déploiement local avec Docker Compose
        // =====================================================
        stage('10 - Deploy local backend central') {
            steps {
                sh '''
                    echo "Deploiement local du backend central..."

                    docker compose pull backend-central || true
                    docker compose up -d backend-central

                    echo "Backend central deploye localement"
                '''
            }
        }
    }

    // =========================================================
    // Actions exécutées après le pipeline
    // =========================================================
    post {

        success {
            echo 'Pipeline backend-central termine avec succes.'
        }

        failure {
            echo 'Pipeline backend-central echoue.'
        }

        always {
            archiveArtifacts artifacts: '''
                backend-central/backend-central-unit-report.html,
                backend-central/backend-central-integration-report.html,
                backend-central/coverage-backend-central.xml,
                backend-central/flake8-backend-central.txt
            ''', allowEmptyArchive: true
        }
    }
}