using Microsoft.AspNetCore.SignalR.Client;
using NBomber.Contracts;
using NBomber.CSharp;

namespace LoadTests;

public class QuickConnectionTest
{
    public static void RunTest()
    {
        Console.WriteLine("🔧 Testing Optimized SignalR Server");
        
        var scenario = Scenario.Create("quick_connection_test", async context =>
        {
            var connection = new HubConnectionBuilder()
                .WithUrl("http://localhost:5076/debateHub")
                .Build();

            try
            {
                var stopwatch = System.Diagnostics.Stopwatch.StartNew();
                await connection.StartAsync();
                await connection.InvokeAsync("JoinDebateRoom", 1);
                stopwatch.Stop();
                
                await connection.InvokeAsync("SendFireReaction", 1);
                
                await connection.InvokeAsync("LeaveDebateRoom", 1);
                await connection.DisposeAsync();
                
                return Response.Ok(statusCode: "OK", sizeBytes: (int)stopwatch.ElapsedMilliseconds);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Connection Error: {ex.Message}");
                return Response.Fail();
            }
        })
        .WithLoadSimulations(
            Simulation.KeepConstant(copies: 20, during: TimeSpan.FromSeconds(45))
        );

        Console.WriteLine("\n🚀 Testing 20 concurrent connections for 15 seconds...");
        NBomberRunner
            .RegisterScenarios(scenario)
            .Run();
            
        Console.WriteLine("\n✅ Quick test completed!");
    }
}