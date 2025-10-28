# DirectMethod.Mqtt.Client

.NET MQTT client implementation - part of the Direct Method Library.

## Installation

```bash
dotnet add package DirectMethod.Mqtt.Client
```

## Quick Start

```csharp
using DirectMethod.Mqtt.Client;

var client = new DirectMethodMqttClient("localhost", 1883, "test/topic");

// Set up message handler
client.MessageReceived += (topic, message) =>
{
    Console.WriteLine($"Received: {message} on topic: {topic}");
};

// Connect and start using the client
try
{
    await client.ConnectAsync();
    await client.SubscribeAsync();
    await client.PublishAsync("Hello from .NET!");
    
    // Keep the application running to receive messages
    // In a real application, you might want to handle this differently
    await Task.Delay(5000);
    
    await client.DisconnectAsync();
}
catch (Exception ex)
{
    Console.WriteLine($"Error: {ex.Message}");
}
finally
{
    client.Dispose();
}
```

## API Reference

### Constructor

```csharp
new DirectMethodMqttClient(string brokerHost, int brokerPort = 1883, string topic = "", string? clientId = null)
```

- `brokerHost`: MQTT broker hostname or IP address
- `brokerPort`: MQTT broker port (default: 1883)
- `topic`: Topic to subscribe and publish to
- `clientId`: Unique client identifier (auto-generated if not provided)

### Methods

#### `ConnectAsync(CancellationToken cancellationToken = default): Task`
Connect to the MQTT broker.

#### `DisconnectAsync(CancellationToken cancellationToken = default): Task`
Disconnect from the MQTT broker.

#### `PublishAsync(string message, CancellationToken cancellationToken = default): Task`
Publish a message to the configured topic.

#### `SubscribeAsync(CancellationToken cancellationToken = default): Task`
Subscribe to the configured topic.

### Properties

#### `IsConnected: bool`
Get the current connection status.

#### `Topic: string`
Get the configured topic.

#### `BrokerInfo: (string Host, int Port)`
Get the broker connection details.

#### `ClientId: string`
Get the client ID.

### Events

#### `MessageReceived: MessageReceivedHandler?`
Event raised when a message is received on the subscribed topic.

- Delegate signature: `void MessageReceivedHandler(string topic, string message)`

## Error Handling

The client includes comprehensive error handling:

```csharp
try
{
    await client.ConnectAsync();
    await client.PublishAsync("test message");
}
catch (InvalidOperationException ex)
{
    Console.WriteLine($"MQTT operation failed: {ex.Message}");
}
catch (ArgumentException ex)
{
    Console.WriteLine($"Invalid parameter: {ex.Message}");
}
```

Common exceptions:
- `InvalidOperationException`: Connection failures, not connected when trying to publish/subscribe
- `ArgumentException`: Invalid constructor parameters
- `ObjectDisposedException`: Using disposed client

## Advanced Usage

### Custom Client ID and Cancellation

```csharp
using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(10));

var client = new DirectMethodMqttClient(
    "mqtt.example.com", 
    1883, 
    "sensors/temperature",
    "my-unique-client-id"
);

try
{
    await client.ConnectAsync(cts.Token);
    await client.SubscribeAsync(cts.Token);
    await client.PublishAsync("temperature: 23.5°C", cts.Token);
}
catch (OperationCanceledException)
{
    Console.WriteLine("Operation was cancelled");
}
finally
{
    await client.DisconnectAsync();
    client.Dispose();
}
```

### Using with Dependency Injection

```csharp
// In Program.cs or Startup.cs
services.AddSingleton<DirectMethodMqttClient>(provider =>
    new DirectMethodMqttClient("localhost", 1883, "app/messages"));

// In your service class
public class MqttService
{
    private readonly DirectMethodMqttClient _mqttClient;
    
    public MqttService(DirectMethodMqttClient mqttClient)
    {
        _mqttClient = mqttClient;
        _mqttClient.MessageReceived += HandleMessage;
    }
    
    private void HandleMessage(string topic, string message)
    {
        // Process message
        Console.WriteLine($"Processing: {message}");
    }
    
    public async Task StartAsync()
    {
        await _mqttClient.ConnectAsync();
        await _mqttClient.SubscribeAsync();
    }
}
```

### Message Handling with Structured Data

```csharp
client.MessageReceived += (topic, message) =>
{
    try
    {
        var data = JsonSerializer.Deserialize<SensorData>(message);
        Console.WriteLine($"Sensor {data.Id}: {data.Value} {data.Unit}");
    }
    catch (JsonException ex)
    {
        Console.WriteLine($"Failed to parse message: {ex.Message}");
    }
};
```

## Requirements

- .NET 6.0 or higher
- MQTTnet 4.3.1.873 or higher

## Thread Safety

The `DirectMethodMqttClient` class is thread-safe for concurrent operations. However, it's recommended to:
- Call `ConnectAsync()` before any other operations
- Avoid calling `Dispose()` while other operations are in progress
- Use proper cancellation tokens for long-running operations

## License

MIT License - see the [LICENSE](../../LICENSE) file for details.

## Contributing

This is part of the Direct Method Library demo project. See the main repository for contribution guidelines.