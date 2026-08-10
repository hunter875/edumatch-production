package com.edumatch.scholarship.service;

import com.edumatch.scholarship.config.RabbitMQConfig;
import com.edumatch.scholarship.dto.OpportunityDto;
import com.edumatch.scholarship.model.Opportunity;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ScholarshipEventService {

    public static final String SCHOLARSHIP_CREATED = "scholarship.created";
    public static final String SCHOLARSHIP_UPDATED = "scholarship.updated";
    public static final String SCHOLARSHIP_DELETED = "scholarship.deleted";
    public static final String NOTIFICATION_SCHOLARSHIP_APPROVED = "notification.scholarship.approved";
    public static final String NOTIFICATION_SCHOLARSHIP_REJECTED = "notification.scholarship.rejected";

    private final OutboxEventService outboxEventService;

    public void scholarshipCreated(Opportunity opportunity) {
        enqueueOpportunityEvent(SCHOLARSHIP_CREATED, opportunity);
    }

    public void scholarshipUpdated(Opportunity opportunity) {
        enqueueOpportunityEvent(SCHOLARSHIP_UPDATED, opportunity);
    }

    public void scholarshipDeleted(Long opportunityId) {
        outboxEventService.enqueue(
                RabbitMQConfig.EXCHANGE_NAME,
                SCHOLARSHIP_DELETED,
                "Opportunity",
                String.valueOf(opportunityId),
                Map.of("opportunityId", opportunityId)
        );
    }

    public void scholarshipApproved(Opportunity opportunity) {
        outboxEventService.enqueue(
                RabbitMQConfig.EXCHANGE_NAME,
                NOTIFICATION_SCHOLARSHIP_APPROVED,
                "Opportunity",
                String.valueOf(opportunity.getId()),
                scholarshipModerationNotification(
                        opportunity,
                        "SCHOLARSHIP_APPROVED",
                        "Học bổng của bạn đã được duyệt!",
                        "Học bổng \"" + opportunity.getTitle() + "\" đã được công khai."
                )
        );
    }

    public void scholarshipRejected(Opportunity opportunity) {
        outboxEventService.enqueue(
                RabbitMQConfig.EXCHANGE_NAME,
                NOTIFICATION_SCHOLARSHIP_REJECTED,
                "Opportunity",
                String.valueOf(opportunity.getId()),
                scholarshipModerationNotification(
                        opportunity,
                        "SCHOLARSHIP_REJECTED",
                        "Học bổng của bạn bị từ chối",
                        "Học bổng \"" + opportunity.getTitle() + "\" không được duyệt."
                )
        );
    }

    private void enqueueOpportunityEvent(String routingKey, Opportunity opportunity) {
        outboxEventService.enqueue(
                RabbitMQConfig.EXCHANGE_NAME,
                routingKey,
                "Opportunity",
                String.valueOf(opportunity.getId()),
                OpportunityDto.fromEntity(opportunity)
        );
    }

    private Map<String, Object> scholarshipModerationNotification(
            Opportunity opportunity,
            String type,
            String title,
            String body
    ) {
        Map<String, Object> notificationEvent = new HashMap<>();
        notificationEvent.put("recipientId", opportunity.getCreatorUserId());
        notificationEvent.put("creatorUserId", opportunity.getCreatorUserId());
        notificationEvent.put("title", title);
        notificationEvent.put("body", body);
        notificationEvent.put("type", type);
        notificationEvent.put("referenceId", opportunity.getId().toString());
        notificationEvent.put("opportunityId", opportunity.getId().toString());
        return notificationEvent;
    }
}
