import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

// Custom metrics
const errorRate = new Rate("errors");
const queryResponseTime = new Trend("query_response_time");
const parallelResponseTime = new Trend("parallel_response_time");

// Test configuration - 100 total requests, 10 concurrent users
// Note: Updated for 250/day limit, but respects 10/minute limit
export const options = {
    // 10 virtual users, each making 10 requests = 100 total requests
    vus: 10, // 10 concurrent users (parallel requests)
    iterations: 100, // Total 100 requests across all VUs
    maxDuration: "5m", // Safety timeout
    // Note: This test makes 100 requests total, which is within 250/day limit
    // But exceeds 10/minute limit - use k6-parallel-10.js for per-minute testing

    thresholds: {
        http_req_duration: ["p(95)<5000"], // 95% of requests should be below 5s
        http_req_failed: ["rate<0.10"], // Allow up to 10% errors (due to rate limits)
        errors: ["rate<0.10"],
        query_response_time: ["p(95)<5000"], // Query endpoint specific
    },
};

// Base URL
const BASE_URL = __ENV.BASE_URL || "http://localhost:8000";

// Test data - UPDATE THESE with your actual values
const WIDGET_TOKEN =
    __ENV.WIDGET_TOKEN ||
    "XmCzMNqbqbQtcXgIaQMum37OKatz57lnon3dOEpebWwGZpC75sl_LTo7P_s3UpL78BZOuH8QFwtt3AZNRYyyDw";

export default function () {
    // Test: Widget Query (the main endpoint we want to test)
    const widgetQueryPayload = JSON.stringify({
        query_text: `Parallel test query ${__VU}-${__ITER}`,
        top_k: 5,
        min_score: 0.25,
        session_id: `parallel-session-${__VU}-${__ITER}`,
        page_url: "https://example.com/parallel-test",
    });

    const widgetRes = http.post(
        `${BASE_URL}/api/v1/widget/query`,
        widgetQueryPayload,
        {
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${WIDGET_TOKEN}`,
            },
            tags: { name: "widget_query" },
        }
    );

    const widgetCheck = check(widgetRes, {
        "widget query status is 200": (r) => r.status === 200,
        "widget query has answer": (r) => {
            try {
                const body = JSON.parse(r.body);
                return (
                    body.status === "success" && body.data && body.data.answer
                );
            } catch {
                return false;
            }
        },
        "widget query response time < 10s": (r) => r.timings.duration < 10000,
    });

    queryResponseTime.add(widgetRes.timings.duration);
    errorRate.add(!widgetCheck);

    // Log rate limit errors specifically
    if (widgetRes.status === 429) {
        console.log(
            `Rate limit hit: VU ${__VU}, Iteration ${__ITER}, Status: ${widgetRes.status}`
        );
    }

    // Small random sleep to simulate real user behavior (0.5-1.5 seconds)
    sleep(Math.random() * 1 + 0.5);
}

export function handleSummary(data) {
    const totalRequests = data.metrics.http_reqs.values.count;
    const failedRequests = data.metrics.http_req_failed.values.count;
    const successRate =
        ((totalRequests - failedRequests) / totalRequests) * 100;

    return {
        stdout: `
      ========================================
      Parallel Load Test Summary
      ========================================
      Configuration:
        - Concurrent Users (VUs): 10
        - Total Requests: ${totalRequests}
        - Target: 100 requests
      
      Results:
        - Successful Requests: ${totalRequests - failedRequests}
        - Failed Requests: ${failedRequests}
        - Success Rate: ${successRate.toFixed(2)}%
      
      Response Times:
        - Average: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms
        - Median (p50): ${data.metrics.http_req_duration.values.med.toFixed(
            2
        )}ms
        - p95: ${data.metrics.http_req_duration.values["p(95)"].toFixed(2)}ms
        - p99: ${data.metrics.http_req_duration.values["p(99)"].toFixed(2)}ms
        - Min: ${data.metrics.http_req_duration.values.min.toFixed(2)}ms
        - Max: ${data.metrics.http_req_duration.values.max.toFixed(2)}ms
      
      Throughput:
        - Requests per second: ${data.metrics.http_reqs.values.rate.toFixed(
            2
        )} req/s
        - Total duration: ${(
            (data.metrics.http_req_duration.values.avg * totalRequests) /
            1000
        ).toFixed(2)}s (estimated)
      
      Query Endpoint Performance:
        - Avg Response Time: ${data.metrics.query_response_time.values.avg.toFixed(
            2
        )}ms
        - p95 Response Time: ${data.metrics.query_response_time.values[
            "p(95)"
        ].toFixed(2)}ms
        - Total Queries: ${data.metrics.query_response_time.values.count}
      
      ========================================
      Analysis:
      - If p95 < 3000ms: ✅ Excellent server performance
      - If p95 < 5000ms: ✅ Good server performance
      - If p95 > 5000ms: ⚠️ Server may be struggling
      - If success rate < 90%: ⚠️ Check for rate limits or server errors
      ========================================
    `,
    };
}
