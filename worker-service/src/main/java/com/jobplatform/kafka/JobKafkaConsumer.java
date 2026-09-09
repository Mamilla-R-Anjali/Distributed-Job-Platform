package com.jobplatform.workerservice.kafka;

import com.jobplatform.workerservice.model.Job;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

@Service
public class JobKafkaConsumer {

    private static final int MAX_RETRIES = 3;
    private static final long JOB_TIMEOUT_MS = 5000;

    private final String jobServiceUrl;
    private final String workerApiKey;

    private final HttpClient httpClient =
            HttpClient.newHttpClient();

    public JobKafkaConsumer(
            @Value("${job.service.url:http://localhost:8080/api/jobs}")
            String jobServiceUrl,

            /*
             * Docker provides WORKER_API_KEY.
             *
             * Explicitly prefer the environment variable so
             * worker-service uses the same key configured for
             * job-service.
             */
            @Value("${WORKER_API_KEY:${worker.api.key:CHANGE_THIS_TO_YOUR_WORKER_KEY}}")
            String workerApiKey) {

        this.jobServiceUrl = jobServiceUrl;
        this.workerApiKey = workerApiKey;
    }

    @KafkaListener(
            topics = "job-topic",
            groupId = "worker-group-v2",
            containerFactory = "kafkaListenerContainerFactory"
    )
    public void consumeJob(Job job) {

        System.out.println();
        System.out.println("========================================");
        System.out.println("        WORKER RECEIVED JOB");
        System.out.println("========================================");
        System.out.println("Job ID     : " + job.getId());
        System.out.println("Job Name   : " + job.getName());
        System.out.println("Job Status : " + job.getStatus());
        System.out.println("Created At : " + job.getCreatedAt());
        System.out.println("========================================");

        String result = executeWithRetry(job);

        if (result != null) {

            updateJobStatus(
                    job.getId(),
                    "COMPLETED",
                    result
            );

            System.out.println();
            System.out.println("========================================");
            System.out.println("          JOB COMPLETED");
            System.out.println("========================================");
            System.out.println("Job ID     : " + job.getId());
            System.out.println("Status     : COMPLETED");
            System.out.println("Result     : " + result);
            System.out.println("========================================");
            System.out.println();

        } else {

            updateJobStatus(
                    job.getId(),
                    "FAILED",
                    "Job execution failed after "
                            + MAX_RETRIES
                            + " attempts"
            );

            System.out.println();
            System.out.println("========================================");
            System.out.println("          JOB FAILED");
            System.out.println("========================================");
            System.out.println("Job ID     : " + job.getId());
            System.out.println("Status     : FAILED");
            System.out.println("========================================");
            System.out.println();
        }
    }

    private String executeWithRetry(Job job) {

        for (int attempt = 1; attempt <= MAX_RETRIES; attempt++) {

            System.out.println(
                    "Executing Job ID " + job.getId()
                            + " - Attempt " + attempt
                            + "/" + MAX_RETRIES
            );

            long startTime = System.currentTimeMillis();

            try {

                String result = executeJob(job);

                long executionTime =
                        System.currentTimeMillis() - startTime;

                if (executionTime > JOB_TIMEOUT_MS) {

                    throw new RuntimeException(
                            "Job execution timed out after "
                                    + JOB_TIMEOUT_MS + " ms"
                    );
                }

                return result;

            } catch (Exception e) {

                System.out.println(
                        "Job ID " + job.getId()
                                + " failed on attempt "
                                + attempt
                                + ": "
                                + e.getMessage()
                );

                if (attempt < MAX_RETRIES) {

                    System.out.println(
                            "Retrying Job ID "
                                    + job.getId()
                                    + "..."
                    );

                    try {

                        Thread.sleep(1000);

                    } catch (InterruptedException interruptedException) {

                        Thread.currentThread().interrupt();

                        System.out.println(
                                "Retry interrupted for Job ID "
                                        + job.getId()
                        );

                        return null;
                    }
                }
            }
        }

        return null;
    }

    private String executeJob(Job job) {

        if (job.getName() != null
                && job.getName().startsWith("FAIL-")) {

            System.out.println(
                    "INTENTIONAL FAILURE TEST for Job ID "
                            + job.getId()
            );

            throw new RuntimeException(
                    "Intentional failure for retry testing"
            );
        }

        System.out.println(
                "Processing Job ID "
                        + job.getId()
                        + "..."
        );

        try {

            Thread.sleep(1000);

        } catch (InterruptedException e) {

            Thread.currentThread().interrupt();

            throw new RuntimeException(
                    "Job execution interrupted"
            );
        }

        String result =
                "Job " + job.getId()
                        + " (" + job.getName()
                        + ") executed successfully";

        System.out.println(
                "Processing finished for Job ID "
                        + job.getId()
                        + "..."
        );

        System.out.println(
                "Execution Result: "
                        + result
        );

        return result;
    }

    private void updateJobStatus(
            Long jobId,
            String status,
            String result) {

        try {

            String escapedResult =
                    result
                            .replace("\\", "\\\\")
                            .replace("\"", "\\\"");

            String jsonBody =
                    "{\"status\":\""
                            + status
                            + "\",\"result\":\""
                            + escapedResult
                            + "\"}";

            HttpRequest request =
                    HttpRequest.newBuilder()
                            .uri(
                                    URI.create(
                                            jobServiceUrl
                                                    + "/"
                                                    + jobId
                                                    + "/status"
                                    )
                            )
                            .header(
                                    "Content-Type",
                                    "application/json"
                            )
                            .header(
                                    "X-Worker-Key",
                                    workerApiKey
                            )
                            .PUT(
                                    HttpRequest.BodyPublishers
                                            .ofString(jsonBody)
                            )
                            .build();

            HttpResponse<String> response =
                    httpClient.send(
                            request,
                            HttpResponse.BodyHandlers.ofString()
                    );

            System.out.println(
                    "JobService status update response: "
                            + response.statusCode()
            );

            if (response.statusCode() >= 200
                    && response.statusCode() < 300) {

                System.out.println(
                        "Job ID " + jobId
                                + " updated to "
                                + status
                );

                System.out.println(
                        "Result saved: "
                                + result
                );

            } else {

                System.out.println(
                        "Failed to update Job ID "
                                + jobId
                                + " to "
                                + status
                                + ". Response: "
                                + response.body()
                );
            }

        } catch (Exception e) {

            System.out.println(
                    "Error updating Job ID "
                            + jobId
                            + " status: "
                            + e.getMessage()
            );
        }
    }
}