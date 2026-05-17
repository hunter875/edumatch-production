package com.edumatch.scholarship.service;

import com.edumatch.scholarship.config.RabbitMQConfig;
import com.edumatch.scholarship.model.Application;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ApplicationEventService {

    public static final String NOTIFICATION_SEND_EMAIL = "notification.send.email";
    public static final String NOTIFICATION_APPLICATION_STATUS = "notification.application.status";

    private final OutboxEventService outboxEventService;

    public void applicationStatusChanged(Application application, String newStatus, String opportunityTitle) {
        enqueueEmailEvent(application, newStatus);
        enqueueRealtimeNotificationEvent(application, newStatus, opportunityTitle);
    }

    private void enqueueEmailEvent(Application application, String newStatus) {
        Map<String, Object> emailEvent = Map.of(
                "applicantUserId", application.getApplicantUserId(),
                "subject", "Cập nhật trạng thái đơn ứng tuyển",
                "body", "Trạng thái đơn ứng tuyển của bạn đã được cập nhật thành: " + newStatus
        );

        outboxEventService.enqueue(
                RabbitMQConfig.EXCHANGE_NAME,
                NOTIFICATION_SEND_EMAIL,
                "Application",
                String.valueOf(application.getId()),
                emailEvent
        );
    }

    private void enqueueRealtimeNotificationEvent(Application application, String newStatus, String opportunityTitle) {
        StatusMessage statusMessage = statusMessage(newStatus, opportunityTitle);
        Map<String, Object> notificationEvent = new HashMap<>();
        notificationEvent.put("recipientId", application.getApplicantUserId());
        notificationEvent.put("title", statusMessage.title());
        notificationEvent.put("body", statusMessage.body());
        notificationEvent.put("type", "APPLICATION_STATUS");
        notificationEvent.put("applicationId", application.getId());
        notificationEvent.put("status", newStatus);
        notificationEvent.put("opportunityTitle", opportunityTitle);

        if (application.getOpportunityId() != null) {
            notificationEvent.put("referenceId", application.getOpportunityId().toString());
            notificationEvent.put("opportunityId", application.getOpportunityId());
        }

        outboxEventService.enqueue(
                RabbitMQConfig.EXCHANGE_NAME,
                NOTIFICATION_APPLICATION_STATUS,
                "Application",
                String.valueOf(application.getId()),
                notificationEvent
        );
    }

    private StatusMessage statusMessage(String newStatus, String opportunityTitle) {
        return switch (newStatus) {
            case "ACCEPTED" -> new StatusMessage(
                    "Đơn ứng tuyển được chấp nhận!",
                    String.format("Chúc mừng! Đơn ứng tuyển của bạn cho học bổng \"%s\" đã được chấp nhận.", opportunityTitle)
            );
            case "REJECTED" -> new StatusMessage(
                    "Đơn ứng tuyển bị từ chối",
                    String.format("Rất tiếc, đơn ứng tuyển của bạn cho học bổng \"%s\" không được chấp nhận lần này.", opportunityTitle)
            );
            case "UNDER_REVIEW" -> new StatusMessage(
                    "Đơn đang được xem xét",
                    String.format("Đơn ứng tuyển của bạn cho học bổng \"%s\" đang được xem xét.", opportunityTitle)
            );
            case "WAITLISTED" -> new StatusMessage(
                    "Đơn trong danh sách chờ",
                    String.format("Đơn ứng tuyển của bạn cho học bổng \"%s\" đã được đưa vào danh sách chờ.", opportunityTitle)
            );
            default -> new StatusMessage(
                    "Cập nhật đơn ứng tuyển",
                    String.format("Trạng thái đơn ứng tuyển cho học bổng \"%s\": %s", opportunityTitle, newStatus)
            );
        };
    }

    private record StatusMessage(String title, String body) {
    }
}
