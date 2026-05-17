# Search Architecture Decision

Ngay ghi nhan: 2026-05-14

Tai lieu nay dinh nghia cach EduMatch thiet ke search theo tung muc dich su dung. Muc tieu la tranh anti-pattern pho bien: moi search deu dung `LIKE '%keyword%'`.

## 1. Decision Summary

He thong dung 3 level search:

| Level | Ten | Khi dung | Cong nghe chinh |
| --- | --- | --- | --- |
| Level 1 | Filter Search | Du lieu co cau truc ro rang | B-tree index |
| Level 2 | Prefix Search | Lookup gan dung gia tri ngan | B-tree index + `keyword%` |
| Level 3 | Full-Text Search | Search noi dung dai, can ranking | MySQL FULLTEXT / PostgreSQL `tsvector` |

Quyet dinh tong:

| Feature | Search level |
| --- | --- |
| Public scholarship search | Level 3 + Level 1 |
| Admin users search | Level 2 |
| Admin scholarships search | Level 1 + Level 2 |
| Admin applications search | Level 1 + Level 2 |

Implementation status:

| Area | Status | Files |
| --- | --- | --- |
| Public scholarship FULLTEXT | Implemented | `OpportunityRepository.searchPublicFullText`, `ScholarshipService.searchOpportunities` |
| Scholarship search indexes | Implemented | `backend-java/scholarship-service/src/main/resources/db/migration/V3__search_indexes.sql` |
| Admin scholarship prefix/filter | Implemented | `ScholarshipService.getAllOpportunitiesForAdmin` |
| Admin applications prefix/filter | Implemented | `ApplicationRepository.searchApplications` |
| Admin users prefix/filter | Implemented | `UserRepository.searchUsers` |
| Auth user search indexes | Implemented | `backend-java/auth-service/src/main/resources/db/migration/V3__user_search_indexes.sql` |

## 2. Search Levels Definition

### 2.1 Level 1 - Filter Search

Dung khi du lieu co cau truc ro rang va query predict duoc.

Dac diem:

- Exact filtering.
- Predictable query.
- B-tree index hieu qua nhat.

Vi du:

```sql
status = 'ACTIVE'
country = 'USA'
deadline >= CURRENT_DATE
provider_id = 10
```

Implementation:

- B-tree index.
- Index can di theo `WHERE` va `ORDER BY`.

Use case:

- Admin dashboard.
- Structured filtering.
- Analytics list.

### 2.2 Level 2 - Prefix Search

Dung khi user/admin biet gan dung gia tri can tim.

Dac diem:

- Lookup nhanh.
- Dataset thuong vua hoac nho.
- B-tree index van hoat dong neu pattern la prefix.

Pattern duoc phep:

```sql
column LIKE 'keyword%'
```

Pattern khong nen dung:

```sql
column LIKE '%keyword%'
```

Index:

```sql
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_opportunities_title ON opportunities(title);
```

Optimization nen co:

- Them column normalized nhu `email_lower`, `username_lower`, `title_lower`.
- Tranh query dang `LOWER(email) LIKE ...` vi function tren column co the lam DB khong dung duoc index tot.

### 2.3 Level 3 - Full-Text Search

Dung khi user khong biet chinh xac du lieu va can search noi dung dai.

Dac diem:

- Search title/description/content.
- Co relevance ranking.
- Tot hon `LIKE '%keyword%'` cho content search.

Technology:

- MySQL: `FULLTEXT`.
- PostgreSQL: `tsvector`.

Vi du MySQL:

```sql
ALTER TABLE opportunities
ADD FULLTEXT INDEX ft_opportunities_title_description (title, full_description);
```

Query:

```sql
SELECT
    id,
    title,
    MATCH(title, full_description)
        AGAINST (:keyword IN NATURAL LANGUAGE MODE) AS relevance
FROM opportunities
WHERE is_public = 1
  AND moderation_status = 'APPROVED'
  AND application_deadline >= CURRENT_DATE
  AND MATCH(title, full_description)
        AGAINST (:keyword IN NATURAL LANGUAGE MODE)
ORDER BY relevance DESC, created_at DESC
LIMIT :limit OFFSET :offset;
```

## 3. Search Implementation By Feature

### 3.1 Public Scholarship Search

Endpoint:

```txt
GET /api/v1/scholarships?q=...
```

Nature:

User search noi dung, khong biet exact name.

Vi du:

```txt
ai
usa master
business scholarship
cybersecurity graduate
```

Required levels:

- Level 3 - Full-Text Search la primary.
- Level 1 - Filter ket hop voi full-text.

Example:

```txt
q=ai
country=usa
degree=master
deadline>=today
```

Indexes:

```sql
FULLTEXT(title, full_description)
INDEX(country)
INDEX(degree)
INDEX(application_deadline)
INDEX(is_public, moderation_status, application_deadline)
```

Forbidden:

```sql
LIKE '%keyword%'
```

Decision:

```txt
Hybrid Search = Fulltext + Filter
```

Day la huong chuan cho cac he thong nhu job portal, scholarship platform, marketplace search.

### 3.2 Admin Users Search

Nature:

Admin lookup user gan dung:

```txt
student01
john@
gmail
```

Required level:

- Level 2 - Prefix Search.

Query:

```sql
WHERE email LIKE 'john%'
   OR username LIKE 'john%'
```

Indexes:

```sql
INDEX(email)
INDEX(username)
```

Optional optimization:

```sql
email_lower
username_lower
```

Not required:

- Full-text search.

Decision:

```txt
Level 2 only
```

### 3.3 Admin Scholarships Search

Nature:

Admin thuong:

- Nho title gan dung.
- Filter provider.
- Filter status/moderation status.

Khong phai search noi dung dai.

Required levels:

- Level 1 - Filter la primary.
- Level 2 - Prefix Search la secondary.

Fields:

```txt
status
provider_id
moderation_status
created_at
title prefix
```

Indexes:

```sql
INDEX(status)
INDEX(provider_id)
INDEX(created_at)
INDEX(title)
```

Not required:

- Full-text search.

Decision:

```txt
Level 1 + Level 2
```

### 3.4 Admin Applications Search

Nature:

Admin lookup chinh xac hoac gan dung:

```txt
email
username
application_id
```

Required levels:

- Level 2 - Prefix Search.
- Level 1 - Filter.

Fields:

```txt
email
applicant_name
status
submitted_date
scholarship_id
```

Indexes:

```sql
INDEX(applicant_email)
INDEX(status)
INDEX(submitted_at)
INDEX(opportunity_id)
```

Not required:

- Full-text search.

Decision:

```txt
Level 1 + Level 2
```

## 4. FE Search Surfaces

FE hien co cac search surfaces can gan voi decision tren:

| FE surface | File | Decision |
| --- | --- | --- |
| Public scholarships | `frontend/src/app/user/scholarships/page.tsx` | Level 3 + Level 1 |
| Admin users | `frontend/src/app/admin/users/page.tsx` | Level 2 |
| Admin scholarships | `frontend/src/app/admin/scholarships/page.tsx` | Level 1 + Level 2 |
| Admin applications | `frontend/src/app/admin/applications/page.tsx` | Level 1 + Level 2 |
| Provider scholarships | `frontend/src/app/employer/scholarships/page.tsx` | Level 1 + Level 2 neu data lon |
| Provider applications | `frontend/src/app/employer/applications/page.tsx` | Level 1 + Level 2 neu data lon |
| Messages | `frontend/src/app/messages/page.tsx` | Client-side ok luc nho; backend prefix/full-text neu message data lon |
| UserDirectory chat | `frontend/src/components/UserDirectory.tsx` | Client-side ok luc nho; backend prefix neu user directory lon |

## 5. Migration Plan

### Phase 1 - Fix anti-pattern quan trong nhat

Public scholarship search:

- Done: doi `LIKE '%keyword%'` thanh MySQL FULLTEXT.
- Done: giu filter structured bang B-tree index.
- Done: giu pagination.

### Phase 2 - Admin lookup

Admin users/applications:

- Done: chuyen search sang prefix search.
- Done: them B-tree index cho lookup/filter can thiet.
- Pending optional: them normalized columns neu can case-insensitive search on dinh tren collation khong phu hop.
- Done: khong dung FULLTEXT neu chi lookup email/username/id.

### Phase 3 - Provider/user list

Provider scholarships/applications va user applications:

- Neu list nho: client-side search chap nhan duoc.
- Neu list co the len hang nghin row: chuyen sang backend pagination + keyword prefix/filter.

### Phase 4 - Search engine rieng neu can

Chi dung Meilisearch/Typesense/OpenSearch/Elasticsearch khi can:

- Autocomplete tot.
- Fuzzy search.
- Synonym.
- Highlight.
- Search tieng Viet co dau/khong dau tot hon.
- Analytics search.
- Scale doc lon hon kha nang DB full-text.

## 6. Final Rule

Khong toi uu search theo cam tinh. Moi search moi phai tu hoi:

1. Day la exact filter, prefix lookup, hay content search?
2. User co biet gan dung gia tri khong?
3. Search tren field ngan hay long text?
4. Dataset co the lon den muc nao?
5. Query co can relevance ranking khong?

Nguyen tac ngan gon:

```txt
Filter -> B-tree.
Lookup -> Prefix search.
Content -> Full-text.
Semantic/recommendation -> Vector/embedding.
```
