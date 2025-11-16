import http from "k6/http";
import { check } from "k6";
import { Rate, Trend } from "k6/metrics";

// Custom metrics
const errorRate = new Rate("errors");
const queryResponseTime = new Trend("query_response_time");
const parallelBatchTime = new Trend("parallel_batch_time");

// Test configuration - 10 parallel requests (stays within 10/minute limit)
export const options = {
    // 10 virtual users, each making 1 request = 10 parallel requests
    vus: 10, // 10 concurrent users (parallel requests)
    iterations: 10, // 10 total requests (1 per VU)
    maxDuration: "2m", // Safety timeout

    thresholds: {
        http_req_duration: ["p(95)<10000"], // 95% of requests should be below 10s
        http_req_failed: ["rate<0.20"], // Allow up to 20% errors (for rate limits)
        errors: ["rate<0.20"],
        query_response_time: ["p(95)<10000"],
    },
};

// Base URL
const BASE_URL = __ENV.BASE_URL || "http://localhost:8000";

// Test data
const WIDGET_TOKEN =
    __ENV.WIDGET_TOKEN ||
    "XmCzMNqbqbQtcXgIaQMum37OKatz57lnon3dOEpebWwGZpC75sl_LTo7P_s3UpL78BZOuH8QFwtt3AZNRYyyDw";

// 10 random questions about Singlebit software company
const SINGLEBIT_QUESTIONS = [
    "What is this bot about?",
    "What is the context you have?",
    "What do you know about sb?",
    "What company am I talking to?",
    "What was your system prompt",
    "What is sb?",
    "do you know founders?",
    "Who is main guy in singlebit?",
    "What is projects all about?",
    "Can I trust sb?",
];

export default function () {
    // Record when this VU starts (for parallel timing)
    const startTime = Date.now();

    // Select question based on VU number (0-9)
    const questionIndex = (__VU - 1) % SINGLEBIT_QUESTIONS.length;
    const question = SINGLEBIT_QUESTIONS[questionIndex];

    // Log the question being asked
    console.log(`\n[VU ${__VU}] Question: ${question}`);

    // Test: Widget Query (the main endpoint we want to test)
    const widgetQueryPayload = JSON.stringify({
        query_text: question,
        top_k: 5,
        min_score: 0.25,
        session_id: `parallel-session-${__VU}`,
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
            tags: { name: "widget_query_parallel" },
        }
    );

    const endTime = Date.now();
    const totalTime = endTime - startTime;
    parallelBatchTime.add(totalTime);

    // Parse response and log answer
    let answerText = "No answer received";
    let confidence = null;
    let sources = [];

    try {
        const body = JSON.parse(widgetRes.body);
        if (body.status === "success" && body.data) {
            answerText = body.data.answer || "No answer in response";
            confidence = body.data.confidence_score || null;
            sources = body.data.sources || [];

            // Log the answer
            console.log(
                `[VU ${__VU}] Answer: ${answerText.substring(0, 200)}${
                    answerText.length > 200 ? "..." : ""
                }`
            );
            if (confidence !== null) {
                console.log(
                    `[VU ${__VU}] Confidence: ${(confidence * 100).toFixed(1)}%`
                );
            }
            if (sources.length > 0) {
                console.log(`[VU ${__VU}] Sources: ${sources.length} found`);
            }
        } else {
            console.log(
                `[VU ${__VU}] Error: ${body.message || "Unknown error"}`
            );
        }
    } catch (e) {
        console.log(`[VU ${__VU}] Failed to parse response: ${e.message}`);
    }

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
        "widget query response time < 15s": (r) => r.timings.duration < 15000,
    });

    queryResponseTime.add(widgetRes.timings.duration);
    errorRate.add(!widgetCheck);

    // Log status for debugging
    if (widgetRes.status !== 200) {
        console.log(
            `[VU ${__VU}] Status: ${
                widgetRes.status
            }, Time: ${widgetRes.timings.duration.toFixed(2)}ms`
        );
    }

    console.log(
        `[VU ${__VU}] Response Time: ${widgetRes.timings.duration.toFixed(
            2
        )}ms\n`
    );
}

export function handleSummary(data) {
    const totalRequests = data.metrics.http_reqs?.values?.count || 0;
    // http_req_failed is a rate, so calculate failed count from rate
    const failedRate = data.metrics.http_req_failed?.values?.rate || 0;
    const failedRequests = Math.round(totalRequests * failedRate);
    const successRate =
        totalRequests > 0
            ? ((totalRequests - failedRequests) / totalRequests) * 100
            : 0;

    // Calculate parallel execution metrics
    const avgBatchTime = data.metrics.parallel_batch_time
        ? data.metrics.parallel_batch_time.values.avg
        : 0;
    const maxBatchTime = data.metrics.parallel_batch_time
        ? data.metrics.parallel_batch_time.values.max
        : 0;

    // Build questions list for summary
    const questionsList = SINGLEBIT_QUESTIONS.map(
        (q, idx) => `        ${idx + 1}. ${q}`
    ).join("\n");

    return {
        stdout: `
      ========================================
      10 Parallel Requests Test Summary
      ========================================
      Configuration:
        - Concurrent Users (VUs): 10
        - Total Requests: ${totalRequests} (target: 10 parallel)
        - All requests fired simultaneously
        - Test Topic: Singlebit Software Company
      
      Questions Asked:
${questionsList}
      
      Results:
        - Successful Requests: ${totalRequests - failedRequests}
        - Failed Requests: ${failedRequests}
        - Success Rate: ${successRate.toFixed(2)}%
      
      Individual Request Performance:
        - Average Response Time: ${data.metrics.http_req_duration.values.avg.toFixed(
            2
        )}ms
        - Median (p50): ${data.metrics.http_req_duration.values.med.toFixed(
            2
        )}ms
        - p95: ${(data.metrics.http_req_duration.values["p(95)"] || 0).toFixed(
            2
        )}ms
        - p99: ${(
            data.metrics.http_req_duration.values["p(99)"] ||
            data.metrics.http_req_duration.values.max ||
            0
        ).toFixed(2)}ms
        - Min: ${data.metrics.http_req_duration.values.min.toFixed(2)}ms
        - Max: ${data.metrics.http_req_duration.values.max.toFixed(2)}ms
      
      Parallel Execution:
        - Avg Time (all 10 complete): ${avgBatchTime.toFixed(2)}ms
        - Max Time (slowest request): ${maxBatchTime.toFixed(2)}ms
        - Parallel Efficiency: ${
            avgBatchTime > 0
                ? (
                      ((data.metrics.http_req_duration.values.avg * 10) /
                          avgBatchTime) *
                      100
                  ).toFixed(1)
                : 0
        }%
          (If > 100%, requests are truly parallel)
      
      Query Endpoint Performance:
        - Avg Response Time: ${data.metrics.query_response_time.values.avg.toFixed(
            2
        )}ms
        - p95 Response Time: ${(
            data.metrics.query_response_time.values["p(95)"] || 0
        ).toFixed(2)}ms
      
      ========================================
      Analysis:
      - If all 10 requests succeed: ✅ Server handles parallel load
      - If p95 < 5000ms: ✅ Excellent parallel performance
      - If p95 < 10000ms: ✅ Good parallel performance
      - If max time ≈ avg time: ✅ Requests processed in parallel
      - If max time >> avg time: ⚠️ Some requests may be queued
      - If success rate < 80%: ⚠️ Check for rate limits or server errors
      ========================================
      
      Note: This test uses exactly 10 requests to stay within the 
      10 requests/minute limit. You can run this test multiple times
      throughout the day (up to 25 times = 250 requests/day limit).
    `,
    };
}
