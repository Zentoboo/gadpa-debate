using Microsoft.AspNetCore.SignalR.Client;
using NBomber.Contracts;
using NBomber.CSharp;

namespace LoadTests;

public class SignalRLoadTest
{
    private const string ServerUrl = "http://localhost:5076/debateHub";
    private const int DebateId = 1;
    
    public static void Main(string[] args)
    {
        Console.WriteLine("🚀 Starting SignalR Load Tests for Debate System");
        Console.WriteLine("Testing optimized server configuration...\n");
        
        QuickConnectionTest.RunTest();
    }
    
    /// <summary>
    /// Test 1: Connection Performance - How fast can users connect?
    /// Industry benchmark: < 1 second per connection
    /// </summary>
    private static void RunConnectionLoadTest()
    {
        Console.WriteLine("\n🔗 Running Connection Load Test...");
        
        var scenario = Scenario.Create("connection_test", async context =>
        {
            var connection = new HubConnectionBuilder()
                .WithUrl(ServerUrl)
                .WithAutomaticReconnect()
                .Build();

            var stopwatch = System.Diagnostics.Stopwatch.StartNew();
            
            try
            {
                await connection.StartAsync();
                await connection.InvokeAsync("JoinDebateRoom", DebateId);
                
                stopwatch.Stop();
                
                // Clean up
                await connection.InvokeAsync("LeaveDebateRoom", DebateId);
                await connection.DisposeAsync();
                
                return Response.Ok(statusCode: "connected", sizeBytes: stopwatch.ElapsedMilliseconds);
            }
            catch (Exception ex)
            {
                stopwatch.Stop();
                return Response.Fail();
            }
        })
        .WithLoadSimulations(
            Simulation.RampingInject(rate: 10, interval: TimeSpan.FromSeconds(1), during: TimeSpan.FromSeconds(30)) // 10 connections per second for 30 seconds
        );

        NBomberRunner
            .RegisterScenarios(scenario)
            .Run();
    }
    
    /// <summary>
    /// Test 2: Fire Reaction Performance - Real-time message latency
    /// Industry benchmark for real-time: < 100ms latency
    /// </summary>
    private static void RunFireReactionLoadTest()
    {
        Console.WriteLine("\n🔥 Running Fire Reaction Load Test...");
        
        var scenario = Scenario.Create("fire_reaction_test", async context =>
        {
            var connection = new HubConnectionBuilder()
                .WithUrl(ServerUrl)
                .WithAutomaticReconnect()
                .Build();

            try
            {
                await connection.StartAsync();
                await connection.InvokeAsync("JoinDebateRoom", DebateId);
                
                var stopwatch = System.Diagnostics.Stopwatch.StartNew();
                await connection.InvokeAsync("SendFireReaction", DebateId);
                stopwatch.Stop();
                
                await connection.InvokeAsync("LeaveDebateRoom", DebateId);
                await connection.DisposeAsync();
                
                return Response.Ok(statusCode: "fire_sent", sizeBytes: stopwatch.ElapsedMilliseconds);
            }
            catch (Exception ex)
            {
                return Response.Fail();
            }
        })
        .WithLoadSimulations(
            Simulation.KeepConstant(copies: 50, during: TimeSpan.FromMinutes(2)) // 50 users sending fires for 2 minutes
        );

        NBomberRunner
            .RegisterScenarios(scenario)
            .Run();
    }
    
    /// <summary>
    /// Test 3: Concurrent Users Test - Your target of 300+ users
    /// Tests system stability under your expected load
    /// </summary>
    private static void RunConcurrentUsersTest()
    {
        Console.WriteLine("\n👥 Running Concurrent Users Test (Target: 300+ users)...");
        
        var scenario = Scenario.Create("concurrent_users_test", async context =>
        {
            var connection = new HubConnectionBuilder()
                .WithUrl(ServerUrl)
                .WithAutomaticReconnect()
                .Build();

            var fireReactionCount = 0;
            var errors = new List<string>();
            
            // Set up event handlers to measure response times
            connection.On<object>("FireReaction", data => {
                fireReactionCount++;
            });
            
            connection.On<string>("Error", error => {
                errors.Add(error);
            });

            try
            {
                await connection.StartAsync();
                await connection.InvokeAsync("JoinDebateRoom", DebateId);
                
                // Simulate user behavior: send fire reactions every 2-5 seconds
                var random = new Random();
                var testDuration = TimeSpan.FromSeconds(30);
                var startTime = DateTime.UtcNow;
                
                while (DateTime.UtcNow - startTime < testDuration)
                {
                    try
                    {
                        await connection.InvokeAsync("SendFireReaction", DebateId);
                        await Task.Delay(random.Next(2000, 5000)); // 2-5 second delay
                    }
                    catch (Exception ex)
                    {
                        errors.Add(ex.Message);
                    }
                }
                
                await connection.InvokeAsync("LeaveDebateRoom", DebateId);
                await connection.DisposeAsync();
                
                if (errors.Count > 0)
                {
                    return Response.Fail();
                }
                
                return Response.Ok(statusCode: "completed", sizeBytes: fireReactionCount);
            }
            catch (Exception ex)
            {
                return Response.Fail();
            }
        })
        .WithLoadSimulations(
            // Gradual ramp up to 300 users over 2 minutes, then maintain for 3 minutes
            Simulation.RampingInject(rate: 5, interval: TimeSpan.FromSeconds(1), during: TimeSpan.FromMinutes(1)),    // Warm up: 5/sec for 1 min
            Simulation.RampingInject(rate: 15, interval: TimeSpan.FromSeconds(1), during: TimeSpan.FromMinutes(1)),   // Ramp up: 15/sec for 1 min  
            Simulation.KeepConstant(copies: 300, during: TimeSpan.FromMinutes(3)) // Peak load: 300 users for 3 min
        );

        NBomberRunner
            .RegisterScenarios(scenario)
            .Run();
    }
}
