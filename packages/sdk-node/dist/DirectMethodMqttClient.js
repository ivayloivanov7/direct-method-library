"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DirectMethodMqttClient = void 0;
const mqtt = __importStar(require("mqtt"));
/**
 * MQTT client for connecting to brokers, publishing and subscribing to topics
 *
 * This class provides a simple interface for MQTT operations including:
 * - Connecting to an MQTT broker
 * - Publishing messages to a topic
 * - Subscribing to a topic and receiving messages
 *
 * @example
 * ```typescript
 * const client = new DirectMethodMqttClient('localhost', 1883, 'test/topic');
 *
 * client.onMessageReceived((topic, message) => {
 *   console.log(`Received: ${message} on topic: ${topic}`);
 * });
 *
 * await client.connect();
 * await client.subscribe();
 * await client.publish('Hello World!');
 * await client.disconnect();
 * ```
 */
class DirectMethodMqttClient {
    /**
     * Creates a new DirectMethodMqttClient instance
     *
     * @param brokerHost - MQTT broker hostname or IP address
     * @param brokerPort - MQTT broker port (default: 1883)
     * @param topic - Topic to subscribe and publish to
     * @param clientId - Unique client identifier (optional, auto-generated if not provided)
     */
    constructor(brokerHost, brokerPort = 1883, topic, clientId) {
        this.brokerHost = brokerHost;
        this.brokerPort = brokerPort;
        this.topic = topic;
        this.clientId = clientId;
        this.client = null;
        this.messageCallback = null;
        this.isConnected = false;
        if (!brokerHost.trim()) {
            throw new Error('Broker host cannot be empty');
        }
        if (brokerPort <= 0 || brokerPort > 65535) {
            throw new Error('Broker port must be between 1 and 65535');
        }
        if (!topic.trim()) {
            throw new Error('Topic cannot be empty');
        }
    }
    /**
     * Connect to the MQTT broker
     *
     * @returns Promise that resolves when connection is established
     * @throws Error if connection fails
     */
    async connect() {
        if (this.isConnected) {
            console.log('Already connected to MQTT broker');
            return;
        }
        const brokerUrl = `mqtt://${this.brokerHost}:${this.brokerPort}`;
        const options = {
            clientId: this.clientId || `direct-method-client-${Math.random().toString(36).substr(2, 9)}`,
            connectTimeout: 5000,
            reconnectPeriod: 1000,
            clean: true
        };
        return new Promise((resolve, reject) => {
            try {
                this.client = mqtt.connect(brokerUrl, options);
                this.client.on('connect', () => {
                    this.isConnected = true;
                    console.log(`Connected to MQTT broker at ${brokerUrl}`);
                    resolve();
                });
                this.client.on('error', (error) => {
                    this.isConnected = false;
                    console.error('MQTT connection error:', error.message);
                    reject(new Error(`Failed to connect to MQTT broker: ${error.message}`));
                });
                this.client.on('message', (receivedTopic, message) => {
                    if (this.messageCallback) {
                        this.messageCallback(receivedTopic, message.toString());
                    }
                });
                this.client.on('close', () => {
                    this.isConnected = false;
                    console.log('MQTT connection closed');
                });
            }
            catch (error) {
                reject(new Error(`Failed to create MQTT client: ${error instanceof Error ? error.message : 'Unknown error'}`));
            }
        });
    }
    /**
     * Disconnect from the MQTT broker
     *
     * @returns Promise that resolves when disconnection is complete
     */
    async disconnect() {
        if (!this.client || !this.isConnected) {
            console.log('Not connected to MQTT broker');
            return;
        }
        return new Promise((resolve) => {
            this.client.end(false, {}, () => {
                this.isConnected = false;
                console.log('Disconnected from MQTT broker');
                resolve();
            });
        });
    }
    /**
     * Publish a message to the configured topic
     *
     * @param message - Message to publish
     * @returns Promise that resolves when message is published
     * @throws Error if not connected or publish fails
     */
    async publish(message) {
        if (!this.client || !this.isConnected) {
            throw new Error('Not connected to MQTT broker. Call connect() first.');
        }
        return new Promise((resolve, reject) => {
            this.client.publish(this.topic, message, { qos: 0 }, (error) => {
                if (error) {
                    console.error('Failed to publish message:', error.message);
                    reject(new Error(`Failed to publish message: ${error.message}`));
                }
                else {
                    console.log(`Published message: "${message}" to topic: ${this.topic}`);
                    resolve();
                }
            });
        });
    }
    /**
     * Subscribe to the configured topic
     *
     * @returns Promise that resolves when subscription is established
     * @throws Error if not connected or subscription fails
     */
    async subscribe() {
        if (!this.client || !this.isConnected) {
            throw new Error('Not connected to MQTT broker. Call connect() first.');
        }
        return new Promise((resolve, reject) => {
            this.client.subscribe(this.topic, { qos: 0 }, (error) => {
                if (error) {
                    console.error('Failed to subscribe to topic:', error.message);
                    reject(new Error(`Failed to subscribe to topic: ${error.message}`));
                }
                else {
                    console.log(`Subscribed to topic: ${this.topic}`);
                    resolve();
                }
            });
        });
    }
    /**
     * Set a callback function to handle received messages
     *
     * @param callback - Function to call when a message is received
     */
    onMessageReceived(callback) {
        this.messageCallback = callback;
    }
    /**
     * Get the current connection status
     *
     * @returns True if connected to MQTT broker, false otherwise
     */
    getConnectionStatus() {
        return this.isConnected;
    }
    /**
     * Get the configured topic
     *
     * @returns The topic string
     */
    getTopic() {
        return this.topic;
    }
    /**
     * Get the broker connection details
     *
     * @returns Object containing broker host and port
     */
    getBrokerInfo() {
        return {
            host: this.brokerHost,
            port: this.brokerPort
        };
    }
}
exports.DirectMethodMqttClient = DirectMethodMqttClient;
//# sourceMappingURL=DirectMethodMqttClient.js.map