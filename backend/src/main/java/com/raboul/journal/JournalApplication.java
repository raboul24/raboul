package com.raboul.journal;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Entry point. {@code @SpringBootApplication} makes Spring scan this package, find the
 * controller and service classes below, and start an embedded web server (Tomcat).
 * Run it with {@code mvn spring-boot:run} from the backend/ folder.
 */
@SpringBootApplication
public class JournalApplication {

    public static void main(String[] args) {
        SpringApplication.run(JournalApplication.class, args);
    }
}
