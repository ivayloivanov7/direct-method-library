import * as mqtt from 'mqtt';

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
export class DirectMethodMqttClient {
  private client: mqtt.MqttClient | null = null;
  private messageCallback: MessageCallback | null = null;
  private isConnected = false;

  /**
   * Creates a new DirectMethodMqttClient instance
   * 
   * @param brokerHost - MQTT broker hostname or IP address
   * @param brokerPort - MQTT broker port (default: 1883)
   * @param topic - Topic to subscribe and publish to
   * @param clientId - Unique client identifier (optional, auto-generated if not provided)
   */
  constructor(
    private readonly brokerHost: string,
    private readonly brokerPort: number = 1883,
    private readonly topic: string,
    private readonly clientId?: string
  ) {
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
  public async connect(): Promise<void> {
    if (this.isConnected) {
      console.log('Already connected to MQTT broker');
      return;
    }

    const brokerUrl = `mqtt://${this.brokerHost}:${this.brokerPort}`;
    const options: mqtt.IClientOptions = {
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

        this.client.on('error', (error: Error) => {
          this.isConnected = false;
          console.error('MQTT connection error:', error.message);
          reject(new Error(`Failed to connect to MQTT broker: ${error.message}`));
        });

        this.client.on('message', (receivedTopic: string, message: Buffer) => {
          if (this.messageCallback) {
            this.messageCallback(receivedTopic, message.toString());
          }
        });

        this.client.on('close', () => {
          this.isConnected = false;
          console.log('MQTT connection closed');
        });

      } catch (error) {
        reject(new Error(`Failed to create MQTT client: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    });
  }

  /**
   * Disconnect from the MQTT broker
   * 
   * @returns Promise that resolves when disconnection is complete
   */
  public async disconnect(): Promise<void> {
    if (!this.client || !this.isConnected) {
      console.log('Not connected to MQTT broker');
      return;
    }

    return new Promise((resolve) => {
      this.client!.end(false, {}, () => {
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
  public async publish(message: string): Promise<void> {
    if (!this.client || !this.isConnected) {
      throw new Error('Not connected to MQTT broker. Call connect() first.');
    }

    return new Promise((resolve, reject) => {
      this.client!.publish(this.topic, message, { qos: 0 }, (error?: Error | null) => {
        if (error) {
          console.error('Failed to publish message:', error.message);
          reject(new Error(`Failed to publish message: ${error.message}`));
        } else {
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
  public async subscribe(): Promise<void> {
    if (!this.client || !this.isConnected) {
      throw new Error('Not connected to MQTT broker. Call connect() first.');
    }

    return new Promise((resolve, reject) => {
      this.client!.subscribe(this.topic, { qos: 0 }, (error?: Error | null) => {
        if (error) {
          console.error('Failed to subscribe to topic:', error.message);
          reject(new Error(`Failed to subscribe to topic: ${error.message}`));
        } else {
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
  public onMessageReceived(callback: MessageCallback): void {
    this.messageCallback = callback;
  }

  /**
   * Get the current connection status
   * 
   * @returns True if connected to MQTT broker, false otherwise
   */
  public getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Get the configured topic
   * 
   * @returns The topic string
   */
  public getTopic(): string {
    return this.topic;
  }

  /**
   * Get the broker connection details
   * 
   * @returns Object containing broker host and port
   */
  public getBrokerInfo(): { host: string; port: number } {
    return {
      host: this.brokerHost,
      port: this.brokerPort
    };
  }
}