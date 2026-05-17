package com.edumatch.chat.config;

import org.slf4j.MDC;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

@Configuration
public class AppConfig {

    private static final String REQUEST_ID_HEADER = "X-Request-Id";

    /**
     * Tạo một bean RestTemplate để thực hiện các cuộc gọi HTTP
     * (Ví dụ: gọi sang Auth-Service)
     */
    @Bean
    public RestTemplate restTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5000);
        factory.setReadTimeout(5000);
        RestTemplate restTemplate = new RestTemplate(factory);
        restTemplate.getInterceptors().add((request, body, execution) -> {
            String requestId = MDC.get("requestId");
            if (requestId != null && !requestId.isBlank()) {
                request.getHeaders().set(REQUEST_ID_HEADER, requestId);
            }
            return execution.execute(request, body);
        });
        return restTemplate;
    }
}
