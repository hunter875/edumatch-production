# Matching Service - Tài Liệu Chi Tiết

## 📋 Tổng Quan

**Service**: Matching Service  
**Port**: 8000  
**Framework**: FastAPI + Python 3.11  
**Database**: PostgreSQL 15  
**Message Queue**: RabbitMQ  
**Background Worker**: RabbitMQ consumer
**Cache**: Redis  
**Purpose**: AI-powered matching giữa students và scholarships

---

## 🏗️ Kiến Trúc

```
matching-service/
├── app/
│   ├── __init__.py
│   ├── main.py                    # FastAPI application
│   ├── auth.py                    # JWT authentication
│   ├── config.py                  # Configuration settings
│   ├── database.py                # PostgreSQL connection
│   ├── models.py                  # SQLAlchemy models
│   ├── schemas.py                 # Pydantic schemas
│   ├── matching.py                # Matching algorithm
│   ├── service.py                 # Business logic
│   ├── consumer.py                # RabbitMQ consumer
│   └── workers.py                 # RabbitMQ event handlers
├── requirements.txt               # Python dependencies
├── Dockerfile                     # Container image
└── README.md                      # Service documentation
```

---

## 🗄️ Database Schema (PostgreSQL)

### User Profiles Table
```sql
CREATE TABLE user_profiles (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50),
    
    -- Student profile
    education_level VARCHAR(100),
    field_of_study VARCHAR(255),
    gpa DECIMAL(3,2),
    skills TEXT[],  -- Array of skills
    interests TEXT[],  -- Array of interests
    
    -- Preferences
    preferred_countries TEXT[],
    preferred_scholarship_types TEXT[],
    min_scholarship_amount DECIMAL(15,2),
    
    -- Profile vector for similarity matching
    profile_vector VECTOR(384),  -- Embedding vector (pgvector extension)
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_user_id (user_id),
    INDEX idx_field_of_study (field_of_study),
    INDEX idx_education_level (education_level)
);
```

### Scholarships Table (Cache)
```sql
CREATE TABLE scholarships (
    id BIGSERIAL PRIMARY KEY,
    opportunity_id BIGINT UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Eligibility criteria
    education_level VARCHAR(100),
    field_of_study VARCHAR(255),
    min_gpa DECIMAL(3,2),
    required_skills TEXT[],
    
    -- Financial
    amount DECIMAL(15,2),
    currency VARCHAR(10),
    
    -- Location
    country VARCHAR(100),
    city VARCHAR(100),
    is_remote BOOLEAN,
    
    -- Metadata
    deadline DATE,
    status VARCHAR(50),
    
    -- Scholarship vector for similarity matching
    scholarship_vector VECTOR(384),
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_opportunity_id (opportunity_id),
    INDEX idx_status (status),
    INDEX idx_field_of_study (field_of_study)
);
```

### Matches Table
```sql
CREATE TABLE matches (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    scholarship_id BIGINT NOT NULL,
    
    -- Matching scores
    overall_score DECIMAL(5,4) NOT NULL,  -- 0.0000 to 1.0000
    skills_score DECIMAL(5,4),
    interests_score DECIMAL(5,4),
    education_score DECIMAL(5,4),
    gpa_score DECIMAL(5,4),
    location_score DECIMAL(5,4),
    
    -- Matching details
    matched_skills TEXT[],
    matched_interests TEXT[],
    score_breakdown JSONB,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_notified BOOLEAN DEFAULT FALSE,
    notified_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE (user_id, scholarship_id),
    INDEX idx_user_id (user_id),
    INDEX idx_scholarship_id (scholarship_id),
    INDEX idx_overall_score (overall_score DESC),
    INDEX idx_is_active (is_active)
);
```

### Matching Events Table (Audit Log)
```sql
CREATE TABLE matching_events (
    id BIGSERIAL PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    user_id BIGINT,
    scholarship_id BIGINT,
    
    -- Event data
    event_data JSONB,
    matches_found INT,
    execution_time_ms INT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_event_type (event_type),
    INDEX idx_created_at (created_at)
);
```

---

## 🔌 API Endpoints

### Matching Endpoints

#### GET /api/matches
**Description**: Lấy top matches cho user hiện tại

**Headers**:
```
Authorization: Bearer <token>
```

**Query Parameters**:
- `limit` (default: 20): Number of matches
- `minScore` (default: 0.6): Minimum matching score
- `sortBy` (default: score): Sort by score, deadline, amount

**Response** (200 OK):
```json
[
  {
    "id": 1,
    "scholarshipId": 5,
    "opportunityId": 10,
    "title": "AI Research Fellowship 2025",
    "description": "Full scholarship for AI research...",
    "amount": 50000,
    "currency": "USD",
    "deadline": "2025-12-31",
    "country": "USA",
    "overallScore": 0.8756,
    "scoreBreakdown": {
      "skillsScore": 0.92,
      "interestsScore": 0.85,
      "educationScore": 1.0,
      "gpaScore": 0.88,
      "locationScore": 0.65
    },
    "matchedSkills": ["Machine Learning", "Python", "Research"],
    "matchedInterests": ["AI", "Deep Learning"],
    "matchReason": "Strong match based on your AI and ML skills"
  }
]
```

---

#### GET /api/matches/{scholarshipId}/score
**Description**: Tính matching score cho một scholarship cụ thể

**Response** (200 OK):
```json
{
  "scholarshipId": 5,
  "userId": 10,
  "overallScore": 0.8756,
  "scoreBreakdown": {
    "skillsScore": 0.92,
    "interestsScore": 0.85,
    "educationScore": 1.0,
    "gpaScore": 0.88,
    "locationScore": 0.65
  },
  "matchedSkills": ["Machine Learning", "Python"],
  "missingSkills": ["Research Publications"],
  "recommendation": "You're a strong candidate. Consider highlighting your ML projects.",
  "isEligible": true
}
```

---

#### POST /api/matches/batch
**Description**: Tính matches cho nhiều scholarships (Admin only)

**Request Body**:
```json
{
  "scholarshipIds": [1, 2, 3, 4, 5],
  "minScore": 0.7
}
```

**Response** (202 Accepted):
```json
{
  "jobId": "rabbitmq-event-or-batch-id",
  "status": "PROCESSING",
  "message": "Batch matching started"
}
```

---

#### POST /api/matches/refresh
**Description**: Refresh matches cho user hiện tại

**Response** (200 OK):
```json
{
  "matchesFound": 15,
  "topScore": 0.8756,
  "executionTimeMs": 243
}
```

---

### User Profile Endpoints

#### GET /api/profile
**Description**: Lấy matching profile của user

**Response** (200 OK):
```json
{
  "userId": 10,
  "email": "student@example.com",
  "fullName": "Nguyen Van A",
  "educationLevel": "UNDERGRADUATE",
  "fieldOfStudy": "Computer Science",
  "gpa": 3.8,
  "skills": ["Python", "Machine Learning", "React"],
  "interests": ["AI", "Web Development", "Research"],
  "preferredCountries": ["USA", "UK", "Canada"],
  "minScholarshipAmount": 10000,
  "lastUpdated": "2025-01-20T10:00:00Z"
}
```

---

#### PUT /api/profile
**Description**: Cập nhật matching profile

**Request Body**:
```json
{
  "educationLevel": "GRADUATE",
  "fieldOfStudy": "Computer Science",
  "gpa": 3.9,
  "skills": ["Python", "Machine Learning", "Deep Learning"],
  "interests": ["AI", "Research", "NLP"],
  "preferredCountries": ["USA", "UK"],
  "minScholarshipAmount": 15000
}
```

**Response** (200 OK): Updated profile

**Side Effects**: Triggers automatic re-matching

---

### Admin & Analytics

#### GET /api/admin/statistics
**Description**: Get matching statistics (Admin only)

**Response** (200 OK):
```json
{
  "totalUsers": 1523,
  "totalScholarships": 487,
  "totalMatches": 45678,
  "avgMatchScore": 0.7234,
  "matchesLastHour": 127,
  "matchesLast24Hours": 2341,
  "topFields": [
    {"field": "Computer Science", "matches": 12456},
    {"field": "Engineering", "matches": 9876}
  ],
  "scoreDistribution": {
    "0.9-1.0": 234,
    "0.8-0.9": 1567,
    "0.7-0.8": 3456,
    "0.6-0.7": 4567
  }
}
```

---

#### GET /api/admin/matching-events
**Description**: Get matching event logs

**Query Parameters**:
- `eventType` (optional): Filter by event type
- `startDate`, `endDate`: Date range
- `page`, `size`: Pagination

**Response** (200 OK):
```json
[
  {
    "id": 1,
    "eventType": "USER_PROFILE_UPDATED",
    "userId": 10,
    "matchesFound": 15,
    "executionTimeMs": 243,
    "createdAt": "2025-01-20T10:00:00Z"
  }
]
```

---

### Health & Status

#### GET /health
**Description**: Service health check

**Response** (200 OK):
```json
{
  "status": "healthy",
  "database": "connected",
  "rabbitmq": "connected",
  "redis": "connected",
  "consumer": "running",
  "version": "1.0.0"
}
```

---

## 🧮 Matching Algorithm

### Algorithm Overview

```python
def calculate_match_score(user_profile, scholarship) -> float:
    """
    Calculate overall matching score between user and scholarship
    Returns: 0.0 to 1.0
    """
    
    # 1. Education Level Match (25% weight)
    education_score = match_education_level(user_profile, scholarship)
    
    # 2. Field of Study Match (20% weight)
    field_score = match_field_of_study(user_profile, scholarship)
    
    # 3. Skills Match (25% weight)
    skills_score = match_skills(user_profile, scholarship)
    
    # 4. GPA Match (15% weight)
    gpa_score = match_gpa(user_profile, scholarship)
    
    # 5. Interests Match (10% weight)
    interests_score = match_interests(user_profile, scholarship)
    
    # 6. Location Preference (5% weight)
    location_score = match_location(user_profile, scholarship)
    
    # Weighted average
    overall_score = (
        education_score * 0.25 +
        field_score * 0.20 +
        skills_score * 0.25 +
        gpa_score * 0.15 +
        interests_score * 0.10 +
        location_score * 0.05
    )
    
    return round(overall_score, 4)
```

---

### Scoring Components

#### 1. Education Level Match
```python
def match_education_level(user, scholarship) -> float:
    """
    Exact match: 1.0
    Compatible levels: 0.8
    Incompatible: 0.0
    """
    user_level = user.education_level
    required_level = scholarship.education_level
    
    if user_level == required_level:
        return 1.0
    
    # Compatible combinations
    compatible = {
        'GRADUATE': ['GRADUATE', 'UNDERGRADUATE'],
        'UNDERGRADUATE': ['UNDERGRADUATE'],
        'DOCTORATE': ['DOCTORATE', 'GRADUATE']
    }
    
    if required_level in compatible.get(user_level, []):
        return 0.8
    
    return 0.0
```

---

#### 2. Skills Match (Jaccard Similarity)
```python
def match_skills(user, scholarship) -> float:
    """
    Jaccard similarity between user skills and required skills
    """
    user_skills = set(user.skills)
    required_skills = set(scholarship.required_skills)
    
    if not required_skills:
        return 1.0  # No specific skills required
    
    intersection = user_skills & required_skills
    union = user_skills | required_skills
    
    jaccard = len(intersection) / len(union) if union else 0.0
    
    # Boost score if user has all required skills
    if required_skills.issubset(user_skills):
        jaccard = min(jaccard * 1.2, 1.0)
    
    return round(jaccard, 4)
```

---

#### 3. GPA Match
```python
def match_gpa(user, scholarship) -> float:
    """
    Linear score based on GPA comparison
    """
    if not scholarship.min_gpa:
        return 1.0  # No GPA requirement
    
    if user.gpa >= scholarship.min_gpa:
        # Exceeds requirement - bonus points
        excess = (user.gpa - scholarship.min_gpa) / (4.0 - scholarship.min_gpa)
        return min(0.8 + (excess * 0.2), 1.0)
    else:
        # Below requirement - penalty
        deficit = (scholarship.min_gpa - user.gpa) / scholarship.min_gpa
        return max(0.0, 0.5 - (deficit * 0.5))
```

---

#### 4. Semantic Similarity (Embeddings)
```python
from sentence_transformers import SentenceTransformer

model = SentenceTransformer('all-MiniLM-L6-v2')

def generate_profile_embedding(user_profile) -> np.ndarray:
    """
    Generate embedding vector from user profile
    """
    text = f"{user_profile.field_of_study} "
    text += f"{' '.join(user_profile.skills)} "
    text += f"{' '.join(user_profile.interests)}"
    
    embedding = model.encode(text)
    return embedding

def generate_scholarship_embedding(scholarship) -> np.ndarray:
    """
    Generate embedding vector from scholarship
    """
    text = f"{scholarship.title} {scholarship.description} "
    text += f"{scholarship.field_of_study} "
    text += f"{' '.join(scholarship.required_skills)}"
    
    embedding = model.encode(text)
    return embedding

def cosine_similarity(vec1, vec2) -> float:
    """
    Calculate cosine similarity between two vectors
    """
    dot_product = np.dot(vec1, vec2)
    norm_product = np.linalg.norm(vec1) * np.linalg.norm(vec2)
    return dot_product / norm_product if norm_product > 0 else 0.0
```

---

## 📤 RabbitMQ Integration

### Consumed Events

#### user.registered / user.updated
**Queue**: `matching-events`

**Event**:
```json
{
  "eventType": "user.updated",
  "userId": 10,
  "email": "student@example.com",
  "role": "STUDENT",
  "profile": {
    "educationLevel": "UNDERGRADUATE",
    "fieldOfStudy": "Computer Science",
    "gpa": 3.8,
    "skills": ["Python", "ML"],
    "interests": ["AI"]
  },
  "timestamp": "2025-01-20T10:00:00Z"
}
```

**Processing**:
1. Sync user profile to PostgreSQL
2. Generate profile embedding
3. Trigger automatic matching
4. Find top 20 matches
5. Send notifications for high-score matches (>0.85)

---

#### scholarship.published
**Queue**: `scholarship-events`

**Event**:
```json
{
  "eventType": "scholarship.published",
  "opportunityId": 5,
  "title": "AI Research Fellowship",
  "description": "Full scholarship...",
  "fieldOfStudy": "Computer Science",
  "requiredSkills": ["ML", "Python"],
  "minGpa": 3.5,
  "amount": 50000,
  "deadline": "2025-12-31",
  "timestamp": "2025-01-20T10:00:00Z"
}
```

**Processing**:
1. Cache scholarship in PostgreSQL
2. Generate scholarship embedding
3. Run matching for all eligible students
4. Notify students with score > 0.8

---

### Published Events

#### matches.found
**Queue**: `notification-events`

**Event**:
```json
{
  "eventType": "matches.found",
  "userId": 10,
  "matches": [
    {
      "scholarshipId": 5,
      "title": "AI Research Fellowship",
      "score": 0.8756
    }
  ],
  "timestamp": "2025-01-20T10:00:00Z"
}
```

**Consumers**: Chat Service (send notification to user)

---

## ⚙️ RabbitMQ Consumers

### Background Event Handlers

#### refresh_all_matches
**Description**: Recalculate matches for all users (scheduled daily)

**Trigger**: operator/manual job

```python
def refresh_all_matches():
    users = db.query(UserProfile).filter(role='STUDENT').all()
    
    for user in users:
        matches = calculate_matches_for_user(user.id)
        save_matches(user.id, matches)
    
    return {"users_processed": len(users)}
```

---

#### calculate_batch_matches
**Description**: Calculate matches for specific scholarships

```python
def calculate_batch_matches(scholarship_ids, min_score=0.6):
    results = []
    
    for scholarship_id in scholarship_ids:
        scholarship = db.query(Scholarship).get(scholarship_id)
        users = get_eligible_users(scholarship)
        
        for user in users:
            score = calculate_match_score(user, scholarship)
            if score >= min_score:
                match = create_match(user.id, scholarship.id, score)
                results.append(match)
    
    return {"matches_created": len(results)}
```

---

#### cleanup_old_matches
**Description**: Remove matches for expired scholarships

**Trigger**: operator/manual job

```python
def cleanup_old_matches():
    expired = db.query(Scholarship).filter(
        deadline < datetime.now()
    ).all()
    
    for scholarship in expired:
        db.query(Match).filter(
            scholarship_id=scholarship.id
        ).update({"is_active": False})
    
    db.commit()
```

---

## 🔧 Configuration

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://<postgres-user>:<postgres-password>@localhost:5432/matching_db

# RabbitMQ
RABBITMQ_URL=amqp://<rabbitmq-user>:<rabbitmq-password>@localhost:5672/

# Redis
REDIS_URL=redis://localhost:6379/0

# JWT
JWT_SECRET=same-as-auth-service

# Matching Config
MIN_MATCH_SCORE=0.6
MAX_MATCHES_PER_USER=50
ENABLE_SEMANTIC_MATCHING=true

# Performance
EMBEDDING_MODEL=all-MiniLM-L6-v2
BATCH_SIZE=100
```

---

## 🧪 Testing

### Unit Tests

```bash
cd matching-service

# Install dependencies
pip install -r requirements.txt
pip install pytest pytest-asyncio pytest-cov

# Run tests
pytest tests/ --cov=app --cov-report=html

# Run specific test
pytest tests/test_matching.py::test_calculate_match_score
```

### Test Cases

```python
# tests/test_matching.py

def test_skills_match_exact():
    user = UserProfile(skills=['Python', 'ML', 'React'])
    scholarship = Scholarship(required_skills=['Python', 'ML'])
    
    score = match_skills(user, scholarship)
    assert score >= 0.8

def test_gpa_above_requirement():
    user = UserProfile(gpa=3.9)
    scholarship = Scholarship(min_gpa=3.5)
    
    score = match_gpa(user, scholarship)
    assert score > 0.8

def test_education_level_mismatch():
    user = UserProfile(education_level='UNDERGRADUATE')
    scholarship = Scholarship(education_level='DOCTORATE')
    
    score = match_education_level(user, scholarship)
    assert score == 0.0
```

---

## 📊 Performance Optimization

### Database Indexing

```sql
-- Matching queries
CREATE INDEX idx_matches_user_score ON matches(user_id, overall_score DESC);
CREATE INDEX idx_matches_scholarship_score ON matches(scholarship_id, overall_score DESC);

-- Vector similarity search (pgvector)
CREATE INDEX idx_profile_vector ON user_profiles USING ivfflat (profile_vector vector_cosine_ops);
CREATE INDEX idx_scholarship_vector ON scholarships USING ivfflat (scholarship_vector vector_cosine_ops);
```

### Caching Strategy

```python
# Redis cache for frequent queries
@cache(ttl=300)  # 5 minutes
def get_top_matches(user_id: int):
    return db.query(Match).filter(
        user_id=user_id,
        is_active=True
    ).order_by(overall_score.desc()).limit(20).all()

# Invalidate cache on profile update
def update_user_profile(user_id, profile_data):
    update_profile(user_id, profile_data)
    cache.delete(f"matches:user:{user_id}")
```

---

## 🐛 Troubleshooting

### Issue: Slow Matching
**Symptoms**: Matching takes > 5 seconds per user

**Solutions**:
1. Check database indexes exist
2. Reduce embedding dimensions
3. Increase batch size
4. Use Redis caching

### Issue: No Matches Found
**Check**:
1. User profile is complete
2. Scholarships exist in cache
3. min_score is not too high
4. User is eligible (role=STUDENT)

---

## 📚 References

- FastAPI Documentation
- Sentence Transformers
- pgvector Extension
- RabbitMQ Python Client

---

**Last Updated**: January 2025  
**Service Version**: 1.0.0  
**Maintained By**: EduMatch Data Science Team
