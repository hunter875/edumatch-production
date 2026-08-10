package com.edumatch.scholarship.config;

import org.slf4j.MDC;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

@Configuration
public class AppConfig {

    private static final String REQUEST_ID_HEADER = "X-Request-Id";

    /**
     * Tạo một bean RestTemplate để thực hiện các cuộc gọi HTTP giữa các service.
     * Spring sẽ quản lý bean này và tiêm nó vào những nơi cần thiết.
     * @return Một đối tượng RestTemplate.
     */
    @Bean
    public RestTemplate restTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(500);
        factory.setReadTimeout(1500);
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
