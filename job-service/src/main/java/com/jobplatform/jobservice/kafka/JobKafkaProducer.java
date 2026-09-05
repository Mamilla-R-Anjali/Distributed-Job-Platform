package com.jobplatform.jobservice.kafka;

import com.jobplatform.jobservice.model.Job;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

@Service
public class JobKafkaProducer {

    private static final String TOPIC = "job-topic";

    private final KafkaTemplate<String, Job> kafkaTemplate;

    public JobKafkaProducer(KafkaTemplate<String, Job> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    public void sendJob(Job job) {
        kafkaTemplate.send(TOPIC, String.valueOf(job.getId()), job);
    }
}