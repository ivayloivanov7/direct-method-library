using MQTTnet;
using MQTTnet.Client;
using System.Text;

namespace DirectMethod.Mqtt.Client;

/// <summary>
/// Delegate for handling received MQTT messages
/// </summary>
/// <param name="topic">The topic on which the message was received</param>
/// <param name="message">The message content as a string</param>
public delegate void MessageReceivedHandler(string topic, string message);

/// <summary>
/// MQTT client for connecting to brokers, publishing and subscribing to topics
/// 
/// This class provides a simple interface for MQTT operations including:
/// - Connecting to an MQTT broker
/// - Publishing messages to a topic
/// - Subscribing to a topic and receiving messages
/// </summary>
/// <example>
/// <code>
/// var client = new DirectMethodMqttClient("localhost", 1883, "test/topic");
/// 
/// client.MessageReceived += (topic, message) =>
/// {
///     Console.WriteLine($"Received: {message} on topic: {topic}");
/// };
/// 
/// await client.ConnectAsync();
/// await client.SubscribeAsync();
/// await client.PublishAsync("Hello World!");
/// await client.DisconnectAsync();
/// </code>
/// </example>
public class DirectMethodMqttClient : IDisposable
{
    private readonly string _brokerHost;
    private readonly int _brokerPort;
    private readonly string _topic;
    private readonly string _clientId;
    private readonly IMqttClient _mqttClient;
    private bool _isConnected;
    private bool _disposed;

    /// <summary>
    /// Event raised when a message is received on the subscribed topic
    /// </summary>
    public event MessageReceivedHandler? MessageReceived;

    /// <summary>
    /// Creates a new DirectMethodMqttClient instance
    /// </summary>
    /// <param name="brokerHost">MQTT broker hostname or IP address</param>
    /// <param name="brokerPort">MQTT broker port (default: 1883)</param>
    /// <param name="topic">Topic to subscribe and publish to</param>
    /// <param name="clientId">Unique client identifier (optional, auto-generated if not provided)</param>
    /// <exception cref="ArgumentException">Thrown when parameters are invalid</exception>
    public DirectMethodMqttClient(string brokerHost, int brokerPort = 1883, string topic = "", string? clientId = null)
    {
        if (string.IsNullOrWhiteSpace(brokerHost))
            throw new ArgumentException("Broker host cannot be null or empty", nameof(brokerHost));
        
        if (brokerPort <= 0 || brokerPort > 65535)
            throw new ArgumentException("Broker port must be between 1 and 65535", nameof(brokerPort));
        
        if (string.IsNullOrWhiteSpace(topic))
            throw new ArgumentException("Topic cannot be null or empty", nameof(topic));

        _brokerHost = brokerHost;
        _brokerPort = brokerPort;
        _topic = topic;
        _clientId = clientId ?? $"direct-method-client-{Guid.NewGuid().ToString("N")[..8]}";

        var factory = new MqttFactory();
        _mqttClient = factory.CreateMqttClient();
        
        // Set up event handlers
        _mqttClient.ApplicationMessageReceivedAsync += OnMessageReceivedAsync;
        _mqttClient.DisconnectedAsync += OnDisconnectedAsync;
    }

    /// <summary>
    /// Connect to the MQTT broker
    /// </summary>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Task that completes when connection is established</returns>
    /// <exception cref="InvalidOperationException">Thrown when already connected</exception>
    /// <exception cref="MqttCommunicationException">Thrown when connection fails</exception>
    public async Task ConnectAsync(CancellationToken cancellationToken = default)
    {
        ObjectDisposedException.ThrowIf(_disposed, this);
        
        if (_isConnected)
        {
            Console.WriteLine("Already connected to MQTT broker");
            return;
        }

        var options = new MqttClientOptionsBuilder()
            .WithTcpServer(_brokerHost, _brokerPort)
            .WithClientId(_clientId)
            .WithCleanSession(true)
            .WithTimeout(TimeSpan.FromSeconds(5))
            .Build();

        try
        {
            var result = await _mqttClient.ConnectAsync(options, cancellationToken);
            
            if (result.ResultCode == MqttClientConnectResultCode.Success)
            {
                _isConnected = true;
                Console.WriteLine($"Connected to MQTT broker at {_brokerHost}:{_brokerPort}");
            }
            else
            {
                throw new InvalidOperationException($"Failed to connect to MQTT broker: {result.ResultCode} - {result.ReasonString}");
            }
        }
        catch (Exception ex) when (!(ex is InvalidOperationException))
        {
            throw new InvalidOperationException($"Failed to connect to MQTT broker: {ex.Message}", ex);
        }
    }

    /// <summary>
    /// Disconnect from the MQTT broker
    /// </summary>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Task that completes when disconnection is finished</returns>
    public async Task DisconnectAsync(CancellationToken cancellationToken = default)
    {
        ObjectDisposedException.ThrowIf(_disposed, this);
        
        if (!_isConnected)
        {
            Console.WriteLine("Not connected to MQTT broker");
            return;
        }

        try
        {
            await _mqttClient.DisconnectAsync(cancellationToken: cancellationToken);
            _isConnected = false;
            Console.WriteLine("Disconnected from MQTT broker");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error during disconnect: {ex.Message}");
            _isConnected = false;
        }
    }

    /// <summary>
    /// Publish a message to the configured topic
    /// </summary>
    /// <param name="message">Message to publish</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Task that completes when message is published</returns>
    /// <exception cref="InvalidOperationException">Thrown when not connected</exception>
    /// <exception cref="ArgumentNullException">Thrown when message is null</exception>
    public async Task PublishAsync(string message, CancellationToken cancellationToken = default)
    {
        ObjectDisposedException.ThrowIf(_disposed, this);
        ArgumentNullException.ThrowIfNull(message);
        
        if (!_isConnected)
            throw new InvalidOperationException("Not connected to MQTT broker. Call ConnectAsync() first.");

        var mqttMessage = new MqttApplicationMessageBuilder()
            .WithTopic(_topic)
            .WithPayload(Encoding.UTF8.GetBytes(message))
            .WithQualityOfServiceLevel(MQTTnet.Protocol.MqttQualityOfServiceLevel.AtMostOnce)
            .Build();

        try
        {
            var result = await _mqttClient.PublishAsync(mqttMessage, cancellationToken);
            
            if (result.IsSuccess)
            {
                Console.WriteLine($"Published message: \"{message}\" to topic: {_topic}");
            }
            else
            {
                throw new InvalidOperationException($"Failed to publish message: {result.ReasonCode} - {result.ReasonString}");
            }
        }
        catch (Exception ex) when (!(ex is InvalidOperationException))
        {
            throw new InvalidOperationException($"Failed to publish message: {ex.Message}", ex);
        }
    }

    /// <summary>
    /// Subscribe to the configured topic
    /// </summary>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Task that completes when subscription is established</returns>
    /// <exception cref="InvalidOperationException">Thrown when not connected</exception>
    public async Task SubscribeAsync(CancellationToken cancellationToken = default)
    {
        ObjectDisposedException.ThrowIf(_disposed, this);
        
        if (!_isConnected)
            throw new InvalidOperationException("Not connected to MQTT broker. Call ConnectAsync() first.");

        var subscribeOptions = new MqttClientSubscribeOptionsBuilder()
            .WithTopicFilter(_topic, MQTTnet.Protocol.MqttQualityOfServiceLevel.AtMostOnce)
            .Build();

        try
        {
            var result = await _mqttClient.SubscribeAsync(subscribeOptions, cancellationToken);
            
            if (result.Items.All(item => item.ResultCode == MqttClientSubscribeResultCode.GrantedQoS0))
            {
                Console.WriteLine($"Subscribed to topic: {_topic}");
            }
            else
            {
                var failedSubscriptions = result.Items.Where(item => item.ResultCode != MqttClientSubscribeResultCode.GrantedQoS0);
                var errors = string.Join(", ", failedSubscriptions.Select(item => $"{item.TopicFilter}: {item.ResultCode}"));
                throw new InvalidOperationException($"Failed to subscribe to topic: {errors}");
            }
        }
        catch (Exception ex) when (!(ex is InvalidOperationException))
        {
            throw new InvalidOperationException($"Failed to subscribe to topic: {ex.Message}", ex);
        }
    }

    /// <summary>
    /// Get the current connection status
    /// </summary>
    /// <returns>True if connected to MQTT broker, false otherwise</returns>
    public bool IsConnected => _isConnected && _mqttClient.IsConnected;

    /// <summary>
    /// Get the configured topic
    /// </summary>
    /// <returns>The topic string</returns>
    public string Topic => _topic;

    /// <summary>
    /// Get the broker connection details
    /// </summary>
    /// <returns>Tuple containing broker host and port</returns>
    public (string Host, int Port) BrokerInfo => (_brokerHost, _brokerPort);

    /// <summary>
    /// Get the client ID
    /// </summary>
    /// <returns>The client ID string</returns>
    public string ClientId => _clientId;

    private Task OnMessageReceivedAsync(MqttApplicationMessageReceivedEventArgs e)
    {
        try
        {
            var topic = e.ApplicationMessage.Topic;
            var message = Encoding.UTF8.GetString(e.ApplicationMessage.PayloadSegment);
            
            MessageReceived?.Invoke(topic, message);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error processing received message: {ex.Message}");
        }
        
        return Task.CompletedTask;
    }

    private Task OnDisconnectedAsync(MqttClientDisconnectedEventArgs e)
    {
        _isConnected = false;
        Console.WriteLine($"MQTT client disconnected: {e.Reason}");
        
        if (e.Exception != null)
        {
            Console.WriteLine($"Disconnect exception: {e.Exception.Message}");
        }
        
        return Task.CompletedTask;
    }

    /// <summary>
    /// Dispose of the MQTT client and release resources
    /// </summary>
    public void Dispose()
    {
        Dispose(true);
        GC.SuppressFinalize(this);
    }

    /// <summary>
    /// Protected dispose method
    /// </summary>
    /// <param name="disposing">True if disposing managed resources</param>
    protected virtual void Dispose(bool disposing)
    {
        if (!_disposed && disposing)
        {
            try
            {
                if (_isConnected)
                {
                    _mqttClient.DisconnectAsync().GetAwaiter().GetResult();
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error during dispose: {ex.Message}");
            }
            finally
            {
                _mqttClient?.Dispose();
                _disposed = true;
            }
        }
    }
}