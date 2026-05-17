package com.edumatch.scholarship;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class SchoolarshipServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(SchoolarshipServiceApplication.class, args);
    }

}
