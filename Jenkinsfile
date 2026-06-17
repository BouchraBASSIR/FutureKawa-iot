 pipeline {
            agent any
            stages {
                stage('Linter & Qualité Code') {
                    steps {
                        // Analyse statique du code Python (ex: flake8 ou ruff)
                        sh 'pip install ruff && ruff check FutureKawa-iot/'
                    }
                }
            }
 }