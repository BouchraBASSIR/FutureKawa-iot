#include "DHT.h"
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// =====================
// CONFIGURATION
// =====================

// DHT11
#define DHTPIN 14
#define DHTTYPE DHT11
DHT dht(DHTPIN, DHTTYPE);

// WiFi
const char* ssid     = "Redmi Note 8 (2021)";          // ← remplace par ton WiFi
const char* password = "H123456789y@";  // ← remplace par ton mdp

// MQTT Broker (IP de ton PC)
const char* mqtt_server    = "10.31.146.195"; 
const int   mqtt_port      = 1883;
const char* mqtt_client_id = "esp32-capteur";

// Topic MQTT
const char* topic_mesures = "capteur/mesures";

// Intervalle d'envoi (toutes les 10 secondes)
const long INTERVALLE = 10000;

// =====================
// OBJETS
// =====================
WiFiClient   espClient;
PubSubClient client(espClient);
unsigned long dernierEnvoi = 0;

// =====================
// CONNEXION WIFI
// =====================
void connecterWifi() {
  Serial.print("Connexion WiFi a ");
  Serial.println(ssid);

  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("");
  Serial.println("WiFi connecte !");
  Serial.print("IP de l'ESP32 : ");
  Serial.println(WiFi.localIP());
}

// =====================
// CONNEXION MQTT
// =====================
void connecterMQTT() {
  while (!client.connected()) {
    Serial.print("Connexion MQTT...");

    if (client.connect(mqtt_client_id)) {
      Serial.println("MQTT connecte !");
    } else {
      Serial.print("Echec, code erreur = ");
      Serial.println(client.state());
      Serial.println("Nouvelle tentative dans 5 secondes...");
      delay(5000);
    }
  }
}

// =====================
// SETUP
// =====================
void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("=== Module IoT - Capteur DHT11 ===");

  // Démarrage capteur
  dht.begin();

  // Connexion WiFi
  connecterWifi();

  // Config MQTT
  client.setServer(mqtt_server, mqtt_port);
  connecterMQTT();
}

// =====================
// LOOP
// =====================
void loop() {
  // Maintenir la connexion MQTT
  if (!client.connected()) {
    connecterMQTT();
  }
  client.loop();

  unsigned long maintenant = millis();

  // Envoi toutes les 10 secondes
  if (maintenant - dernierEnvoi >= INTERVALLE) {
    dernierEnvoi = maintenant;

    // Lecture capteur
    float humidite    = dht.readHumidity();
    float temperature = dht.readTemperature();

    // Vérification lecture
    if (isnan(humidite) || isnan(temperature)) {
      Serial.println("Erreur lecture capteur DHT11 !");
      return;
    }

    // Affichage Serial
    Serial.print("Temperature : ");
    Serial.print(temperature);
    Serial.print("C  |  Humidite : ");
    Serial.print(humidite);
    Serial.println("%");

    // Construction JSON
    JsonDocument doc;
    doc["temperature"] = temperature;
    doc["humidite"]    = humidite;
    doc["timestamp"]   = millis();

    char jsonBuffer[200];
    serializeJson(doc, jsonBuffer);

    // Publication MQTT
    client.publish(topic_mesures, jsonBuffer);
    Serial.print("Publie sur MQTT : ");
    Serial.println(jsonBuffer);

    Serial.println("-----------------------------------");
  }
}