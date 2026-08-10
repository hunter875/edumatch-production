# Scholarship Service - Tài Liệu Chi Tiết

## 📋 Tổng Quan

**Service**: Scholarship Service  
**Port**: 8082  
**Framework**: Spring Boot 3.x + Java 17  
**Database**: MySQL 8.0  
**Purpose**: Quản lý scholarships, applications, và matching giữa students và opportunities

---

## 🏗️ Kiến Trúc

```
scholarship-service/
├── src/main/java/com/edumatch/scholarship/
│   ├── SchoolarshipServiceApplication.java    # Main application
│   ├── config/                                 # Configuration classes
│   ├── controller/                             # REST API endpoints
│   ├── dto/                                    # Data Transfer Objects
│   ├── exception/                              # Exception handlers
│   ├── model/                                  # JPA entities
│   ├── repository/                             # Database repositories
│   ├── security/                               # Security config & JWT
│   └── service/                                # Business logic
├── src/main/resources/
│   └── application.properties                  # Configuration
├── src/test/java/                              # Unit tests
└── APPLICATION_STATUS_NOTIFICATION_FLOW.md     # Notification flow doc
```

---

## 🗄️ Database Schema

### Opportunities Table (Scholarships)
```sql
CREATE TABLE opportunities (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    organization_id BIGINT,
    organization_name VARCHAR(255),
    
    -- Financial details
    amount DECIMAL(15,2),
    currency VARCHAR(10) DEFAULT 'USD',
    
    -- Eligibility
    education_level VARCHAR(100),
    field_of_study VARCHAR(255),
    min_gpa DECIMAL(3,2),
    required_skills TEXT,
    
    -- Dates
    deadline DATE,
    start_date DATE,
    duration_months INT,
    
    -- Location
    country VARCHAR(100),
    city VARCHAR(100),
    is_remote BOOLEAN DEFAULT FALSE,
    
    -- Status
    status ENUM('DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED') DEFAULT 'DRAFT',
    max_applicants INT,
    current_applicants INT DEFAULT 0,
    
    -- Metadata
    created_by BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_status (status),
    INDEX idx_deadline (deadline),
    INDEX idx_organization (organization_id),
    INDEX idx_field_of_study (field_of_study),
    INDEX idx_education_level (education_level),
    FOREIGN KEY (created_by) REFERENCES users(id)
);
```

### Applications Table
```sql
CREATE TABLE applications (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    opportunity_id BIGINT NOT NULL,
    student_id BIGINT NOT NULL,
    
    -- Application details
    cover_letter TEXT,
    resume_url VARCHAR(500),
    additional_documents TEXT,
    
    -- Status tracking
    status ENUM('PENDING', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED', 'WITHDRAWN') DEFAULT 'PENDING',
    reviewed_by BIGINT,
    review_notes TEXT,
    reviewed_at TIMESTAMP,
    
    -- Matching score
    matching_score DECIMAL(5,2),
    
    -- Timestamps
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_opportunity (opportunity_id),
    INDEX idx_student (student_id),
    INDEX idx_status (status),
    UNIQUE KEY unique_application (opportunity_id, student_id),
    FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Application Reviews Table
```sql
CREATE TABLE application_reviews (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    application_id BIGINT NOT NULL,
    reviewer_id BIGINT NOT NULL,
    
    rating INT CHECK (rating BETWEEN 1 AND 5),
    comments TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewer_id) REFERENCES users(id)
);
```

---

## 🔌 API Endpoints

### Scholarships Management

#### POST /api/scholarships
**Description**: Tạo scholarship mới (Employer/Admin only)

**Headers**:
```
Authorization: Bearer <token>
```

**Request Body**:
```json
{
  "title": "AI Research Fellowship 2025",
  "description": "Full scholarship for AI research students",
  "amount": 50000,
  "currency": "USD",
  "educationLevel": "GRADUATE",
  "fieldOfStudy": "Computer Science",
  "minGpa": 3.5,
  "requiredSkills": ["Machine Learning", "Python", "Research"],
  "deadline": "2025-12-31",
  "startDate": "2026-01-15",
  "durationMonths": 12,
  "country": "USA",
  "city": "Boston",
  "isRemote": false,
  "maxApplicants": 50
}
```

**Response** (201 Created):
```json
{
  "id": 1,
  "title": "AI Research Fellowship 2025",
  "description": "Full scholarship for AI research students",
  "amount": 50000,
  "currency": "USD",
  "organizationId": 5,
  "organizationName": "MIT Research Lab",
  "educationLevel": "GRADUATE",
  "fieldOfStudy": "Computer Science",
  "minGpa": 3.5,
  "requiredSkills": ["Machine Learning", "Python", "Research"],
  "deadline": "2025-12-31",
  "status": "DRAFT",
  "createdBy": 10,
  "createdAt": "2025-01-20T10:00:00Z"
}
```

---

#### GET /api/scholarships
**Description**: Lấy danh sách scholarships (Public)

**Query Parameters**:
- `page` (default: 0): Page number
- `size` (default: 20): Page size
- `status` (optional): Filter by status
- `fieldOfStudy` (optional): Filter by field
- `educationLevel` (optional): Filter by level
- `country` (optional): Filter by country
- `minAmount` (optional): Minimum scholarship amount
- `maxAmount` (optional): Maximum scholarship amount

**Response** (200 OK):
```json
{
  "content": [
    {
      "id": 1,
      "title": "AI Research Fellowship 2025",
      "description": "Full scholarship for AI research...",
      "amount": 50000,
      "currency": "USD",
      "organizationName": "MIT Research Lab",
      "deadline": "2025-12-31",
      "status": "PUBLISHED",
      "currentApplicants": 12,
      "maxApplicants": 50
    }
  ],
  "totalElements": 150,
  "totalPages": 8,
  "currentPage": 0,
  "pageSize": 20
}
```

---

#### GET /api/scholarships/search
**Description**: Tìm kiếm scholarships

**Query Parameters**:
- `keyword` (required): Search keyword
- `page`, `size`: Pagination

**Response** (200 OK):
```json
[
  {
    "id": 1,
    "title": "AI Research Fellowship 2025",
    "description": "Full scholarship for AI research...",
    "amount": 50000,
    "deadline": "2025-12-31",
    "matchingScore": 0.85
  }
]
```

---

#### GET /api/scholarships/{id}
**Description**: Lấy chi tiết scholarship

**Response** (200 OK):
```json
{
  "id": 1,
  "title": "AI Research Fellowship 2025",
  "description": "Full scholarship for AI research students...",
  "amount": 50000,
  "currency": "USD",
  "organizationId": 5,
  "organizationName": "MIT Research Lab",
  "educationLevel": "GRADUATE",
  "fieldOfStudy": "Computer Science",
  "minGpa": 3.5,
  "requiredSkills": ["Machine Learning", "Python", "Research"],
  "deadline": "2025-12-31",
  "startDate": "2026-01-15",
  "durationMonths": 12,
  "country": "USA",
  "city": "Boston",
  "isRemote": false,
  "status": "PUBLISHED",
  "currentApplicants": 12,
  "maxApplicants": 50,
  "createdBy": 10,
  "createdAt": "2025-01-20T10:00:00Z",
  "updatedAt": "2025-01-20T10:00:00Z"
}
```

---

#### PUT /api/scholarships/{id}
**Description**: Cập nhật scholarship (Creator/Admin only)

**Headers**:
```
Authorization: Bearer <token>
```

**Request Body**: Same as POST

**Response** (200 OK): Updated scholarship object

---

#### DELETE /api/scholarships/{id}
**Description**: Xóa scholarship (Creator/Admin only)

**Response** (204 No Content)

---

#### PATCH /api/scholarships/{id}/publish
**Description**: Publish scholarship (Creator/Admin)

**Response** (200 OK):
```json
{
  "id": 1,
  "status": "PUBLISHED",
  "updatedAt": "2025-01-20T11:00:00Z"
}
```

---

#### PATCH /api/scholarships/{id}/close
**Description**: Close scholarship applications

**Response** (200 OK)

---

### Applications Management

#### POST /api/applications
**Description**: Submit application (Student only)

**Headers**:
```
Authorization: Bearer <token>
```

**Request Body**:
```json
{
  "opportunityId": 1,
  "coverLetter": "I am very interested in this scholarship because...",
  "resumeUrl": "https://storage.example.com/resume.pdf",
  "additionalDocuments": [
    "https://storage.example.com/transcript.pdf",
    "https://storage.example.com/recommendation.pdf"
  ]
}
```

**Response** (201 Created):
```json
{
  "id": 1,
  "opportunityId": 1,
  "opportunityTitle": "AI Research Fellowship 2025",
  "studentId": 5,
  "coverLetter": "I am very interested...",
  "resumeUrl": "https://storage.example.com/resume.pdf",
  "status": "PENDING",
  "matchingScore": 0.82,
  "submittedAt": "2025-01-20T10:00:00Z"
}
```

**Business Logic**:
1. Check student hasn't applied before (unique constraint)
2. Check scholarship is still accepting applications
3. Calculate matching score based on student profile
4. Send notification to scholarship creator
5. Publish `application.submitted` event to RabbitMQ

---

#### GET /api/applications
**Description**: Lấy danh sách applications của student

**Headers**:
```
Authorization: Bearer <token>
```

**Query Parameters**:
- `status` (optional): Filter by status
- `page`, `size`: Pagination

**Response** (200 OK):
```json
[
  {
    "id": 1,
    "opportunityId": 1,
    "opportunityTitle": "AI Research Fellowship 2025",
    "organizationName": "MIT Research Lab",
    "status": "PENDING",
    "matchingScore": 0.82,
    "submittedAt": "2025-01-20T10:00:00Z"
  }
]
```

---

#### GET /api/applications/{id}
**Description**: Lấy chi tiết application

**Response** (200 OK):
```json
{
  "id": 1,
  "opportunityId": 1,
  "opportunityTitle": "AI Research Fellowship 2025",
  "studentId": 5,
  "studentName": "Nguyen Van A",
  "studentEmail": "student@example.com",
  "coverLetter": "I am very interested...",
  "resumeUrl": "https://storage.example.com/resume.pdf",
  "additionalDocuments": [
    "https://storage.example.com/transcript.pdf"
  ],
  "status": "UNDER_REVIEW",
  "matchingScore": 0.82,
  "reviewedBy": 10,
  "reviewNotes": "Strong candidate, good match",
  "reviewedAt": "2025-01-21T10:00:00Z",
  "submittedAt": "2025-01-20T10:00:00Z",
  "updatedAt": "2025-01-21T10:00:00Z"
}
```

---

#### PUT /api/applications/{id}/status
**Description**: Update application status (Employer/Admin only)

**Headers**:
```
Authorization: Bearer <token>
```

**Request Body**:
```json
{
  "status": "ACCEPTED",
  "reviewNotes": "Excellent qualifications and strong research background"
}
```

**Response** (200 OK):
```json
{
  "id": 1,
  "status": "ACCEPTED",
  "reviewedBy": 10,
  "reviewNotes": "Excellent qualifications...",
  "reviewedAt": "2025-01-21T10:00:00Z",
  "updatedAt": "2025-01-21T10:00:00Z"
}
```

**Business Logic**:
1. Validate reviewer has permission (creator or admin)
2. Update application status
3. Send notification to student với **opportunityTitle**
4. Publish `application.status_changed` event to RabbitMQ
5. If ACCEPTED, decrement available slots

**Notification Event**:
```json
{
  "eventType": "application.status_changed",
  "applicationId": 1,
  "studentId": 5,
  "opportunityId": 1,
  "opportunityTitle": "AI Research Fellowship 2025",
  "oldStatus": "PENDING",
  "newStatus": "ACCEPTED",
  "reviewNotes": "Excellent qualifications...",
  "timestamp": "2025-01-21T10:00:00Z"
}
```

---

#### PUT /api/applications/{id}/withdraw
**Description**: Withdraw application (Student only)

**Response** (200 OK)

---

#### GET /api/scholarships/{scholarshipId}/applications
**Description**: Lấy applications cho scholarship (Creator/Admin only)

**Query Parameters**:
- `status` (optional): Filter by status
- `sortBy` (optional): Sort by matchingScore, submittedAt

**Response** (200 OK):
```json
[
  {
    "id": 1,
    "studentId": 5,
    "studentName": "Nguyen Van A",
    "studentEmail": "student@example.com",
    "status": "PENDING",
    "matchingScore": 0.82,
    "submittedAt": "2025-01-20T10:00:00Z"
  }
]
```

---

### Application Reviews

#### POST /api/applications/{id}/reviews
**Description**: Add review to application (Employer/Admin)

**Request Body**:
```json
{
  "rating": 5,
  "comments": "Outstanding candidate with excellent research experience"
}
```

**Response** (201 Created)

---

#### GET /api/applications/{id}/reviews
**Description**: Get reviews for application

**Response** (200 OK):
```json
[
  {
    "id": 1,
    "reviewerId": 10,
    "reviewerName": "Dr. Smith",
    "rating": 5,
    "comments": "Outstanding candidate...",
    "createdAt": "2025-01-21T10:00:00Z"
  }
]
```

---

## 📤 RabbitMQ Events

### Published Events

#### application.submitted
**Queue**: `scholarship-events`

**Payload**:
```json
{
  "eventType": "application.submitted",
  "applicationId": 1,
  "opportunityId": 1,
  "opportunityTitle": "AI Research Fellowship 2025",
  "studentId": 5,
  "studentEmail": "student@example.com",
  "creatorId": 10,
  "timestamp": "2025-01-20T10:00:00Z"
}
```

**Consumers**:
- Chat Service: Send notification to creator
- Matching Service: Update matching statistics

---

#### application.status_changed
**Queue**: `notification-events`

**Payload**:
```json
{
  "eventType": "application.status_changed",
  "applicationId": 1,
  "studentId": 5,
  "opportunityId": 1,
  "opportunityTitle": "AI Research Fellowship 2025",
  "oldStatus": "PENDING",
  "newStatus": "ACCEPTED",
  "reviewNotes": "Excellent qualifications",
  "timestamp": "2025-01-21T10:00:00Z"
}
```

**Consumers**:
- Chat Service: Send WebSocket notification to student với scholarship title

---

#### scholarship.published
**Queue**: `matching-events`

**Payload**:
```json
{
  "eventType": "scholarship.published",
  "opportunityId": 1,
  "title": "AI Research Fellowship 2025",
  "fieldOfStudy": "Computer Science",
  "educationLevel": "GRADUATE",
  "requiredSkills": ["ML", "Python"],
  "timestamp": "2025-01-20T10:00:00Z"
}
```

**Consumers**:
- Matching Service: Run matching algorithm for eligible students

---

## 🔐 Security & Authorization

### Permission Matrix

| Endpoint | STUDENT | EMPLOYER | ADMIN |
|----------|---------|----------|-------|
| GET /api/scholarships | ✅ | ✅ | ✅ |
| POST /api/scholarships | ❌ | ✅ | ✅ |
| PUT /api/scholarships/{id} | ❌ | ✅ (own) | ✅ (all) |
| DELETE /api/scholarships/{id} | ❌ | ✅ (own) | ✅ (all) |
| POST /api/applications | ✅ | ❌ | ✅ |
| GET /api/applications | ✅ (own) | ✅ (for scholarships) | ✅ (all) |
| PUT /api/applications/{id}/status | ❌ | ✅ (creator) | ✅ (all) |

---

## 🔧 Configuration

### Environment Variables

```properties
# Database
SPRING_DATASOURCE_URL=jdbc:mysql://localhost:3306/scholarship_db
SPRING_DATASOURCE_USERNAME=root
SPRING_DATASOURCE_PASSWORD=password

# JWT (from Auth Service)
JWT_SECRET=same-secret-as-auth-service

# RabbitMQ
SPRING_RABBITMQ_HOST=localhost
SPRING_RABBITMQ_PORT=5672
SPRING_RABBITMQ_USERNAME=guest
SPRING_RABBITMQ_PASSWORD=guest

# Service URLs
AUTH_SERVICE_URL=http://localhost:8081
MATCHING_SERVICE_URL=http://localhost:8000

# Server
SERVER_PORT=8082
```

---

## 🧪 Testing

### Unit Tests

```bash
cd backend-java/scholarship-service
mvn clean test
```

### Integration Tests

```bash
# Start environment
docker compose -f docker-compose.test.yml up -d scholarship-service mysql rabbitmq

# Test endpoints
curl -X POST http://localhost:8082/api/scholarships \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Scholarship","amount":10000}'

# Cleanup
docker compose -f docker-compose.test.yml down -v
```

---

## 📊 Performance Optimization

### Database Indexes
```sql
CREATE INDEX idx_status ON opportunities(status);
CREATE INDEX idx_deadline ON opportunities(deadline);
CREATE INDEX idx_field ON opportunities(field_of_study);
CREATE INDEX idx_app_status ON applications(status);
CREATE INDEX idx_app_student ON applications(student_id);
```

### Caching Strategy
```java
@Cacheable(value = "scholarships", key = "#id")
public Opportunity getScholarshipById(Long id);

@CacheEvict(value = "scholarships", key = "#id")
public void updateScholarship(Long id, Opportunity opportunity);
```

---

## 📈 Monitoring

### Health Check
**GET** `/actuator/health`

### Metrics
- Total scholarships created
- Total applications submitted
- Application acceptance rate
- Average matching score
- Response times

---

## 🐛 Common Issues

### Issue: Duplicate Application
**Error**: `Duplicate entry for key 'unique_application'`  
**Solution**: User already applied to this scholarship

### Issue: Scholarship Closed
**Error**: `Scholarship is no longer accepting applications`  
**Solution**: Check deadline or max applicants reached

### Issue: Unauthorized Update
**Error**: `403 Forbidden`  
**Solution**: Only creator or admin can update scholarship

---

## 📚 References

- [APPLICATION_STATUS_NOTIFICATION_FLOW.md](./APPLICATION_STATUS_NOTIFICATION_FLOW.md)
- Spring Boot Documentation
- RabbitMQ Documentation

---

**Last Updated**: January 2025  
**Service Version**: 1.0.0  
**Maintained By**: EduMatch Backend Team
