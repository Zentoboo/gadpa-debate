using Microsoft.AspNetCore.SignalR.Client;
using NBomber.Contracts;
using NBomber.CSharp;

namespace LoadTests;

public class SimpleSignalRTest
{
    public static void RunTest()
    {
        Console.WriteLine("🚀 Running Simple SignalR Connection Test");
        
        var scenario = Scenario.Create("simple_connection_test", async context =>
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
                Console.WriteLine($"Error: {ex.Message}");
                return Response.Fail();
            }
        })
        .WithLoadSimulations(
            Simulation.KeepConstant(copies: 10, during: TimeSpan.FromSeconds(30))
        );

        NBomberRunner
            .RegisterScenarios(scenario)
            .Run();
            
        Console.WriteLine("\n✅ Simple test completed! Check the results above.");
    }
}