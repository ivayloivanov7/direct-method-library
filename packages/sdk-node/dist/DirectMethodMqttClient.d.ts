/**
 * Callback function type for handling received messages
 */
export type MessageCallback = (topic: string, message: string) => void;
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
export declare class DirectMethodMqttClient {
    private readonly brokerHost;
    private readonly brokerPort;
    private readonly topic;
    private readonly clientId?;
    private client;
    private messageCallback;
    private isConnected;
    /**
     * Creates a new DirectMethodMqttClient instance
     *
     * @param brokerHost - MQTT broker hostname or IP address
     * @param brokerPort - MQTT broker port (default: 1883)
     * @param topic - Topic to subscribe and publish to
     * @param clientId - Unique client identifier (optional, auto-generated if not provided)
     */
    constructor(brokerHost: string, brokerPort: number | undefined, topic: string, clientId?: string | undefined);
    /**
     * Connect to the MQTT broker
     *
     * @returns Promise that resolves when connection is established
     * @throws Error if connection fails
     */
    connect(): Promise<void>;
    /**
     * Disconnect from the MQTT broker
     *
     * @returns Promise that resolves when disconnection is complete
     */
    disconnect(): Promise<void>;
    /**
     * Publish a message to the configured topic
     *
     * @param message - Message to publish
     * @returns Promise that resolves when message is published
     * @throws Error if not connected or publish fails
     */
    publish(message: string): Promise<void>;
    /**
     * Subscribe to the configured topic
     *
     * @returns Promise that resolves when subscription is established
     * @throws Error if not connected or subscription fails
     */
    subscribe(): Promise<void>;
    /**
     * Set a callback function to handle received messages
     *
     * @param callback - Function to call when a message is received
     */
    onMessageReceived(callback: MessageCallback): void;
    /**
     * Get the current connection status
     *
     * @returns True if connected to MQTT broker, false otherwise
     */
    getConnectionStatus(): boolean;
    /**
     * Get the configured topic
     *
     * @returns The topic string
     */
    getTopic(): string;
    /**
     * Get the broker connection details
     *
     * @returns Object containing broker host and port
     */
    getBrokerInfo(): {
        host: string;
        port: number;
    };
}
//# sourceMappingURL=DirectMethodMqttClient.d.ts.map