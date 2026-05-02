# Notification System Design

## Stage 1
For a basic notification system, we can keep simple REST endpoints.

`GET /notifications?studentId=1042` can return all notifications for one student.
`POST /notifications` can create a new notification.
`POST /notifications/mark-read` can mark one or more messages as read.

Basic headers can be:
- `Content-Type: application/json`
- `Authorization: Bearer <token>`

Example create request:

```json
{
	"studentId": 1042,
	"type": "Placement",
	"title": "Interview Round 1",
	"message": "Your interview is scheduled tomorrow",
	"isRead": false
}
```

Example response:

```json
{
	"id": 501,
	"studentId": 1042,
	"type": "Placement",
	"title": "Interview Round 1",
	"message": "Your interview is scheduled tomorrow",
	"isRead": false,
	"createdAt": "2026-05-02T10:00:00Z"
}
```

For real-time updates, easiest options are polling and websockets. Polling means frontend asks server every few seconds. Websocket means server pushes message instantly when new notification comes.

## Stage 2
I would choose MySQL because this data is structured and easy to store in tables. Also, SQL queries are very useful for filtering by student, read status, and date.

Main table can be `notifications`:
- `id` (PK)
- `studentID`
- `type`
- `title`
- `message`
- `isRead`
- `createdAt`

If data grows a lot, issues can happen like slower queries, bigger storage, and heavy sorting by date. We should use indexes and maybe archive old rows.

Simple SQL examples:

```sql
INSERT INTO notifications(studentID, type, title, message, isRead, createdAt)
VALUES (1042, 'Result', 'Semester Result', 'Result published', false, NOW());
```

```sql
SELECT * FROM notifications WHERE studentID = 1042 ORDER BY createdAt DESC;
```

## Stage 3
Given query:

```sql
SELECT * FROM notifications
WHERE studentID = 1042 AND isRead = false
ORDER BY createdAt DESC;
```

This can be slow when table size is large because DB may scan many rows and then sort them.

Fix is adding a combined index based on filter and sort columns:

```sql
CREATE INDEX idx_notifications_student_read_created
ON notifications(studentID, isRead, createdAt DESC);
```

Why not index all columns? Because every index takes storage and makes insert/update slower. Too many indexes hurt write performance.

Query for placement notifications in last 7 days:

```sql
SELECT * FROM notifications
WHERE studentID = 1042
	AND type = 'Placement'
	AND createdAt >= NOW() - INTERVAL 7 DAY
ORDER BY createdAt DESC;
```

## Stage 4
Fetching all notifications every time is bad because response becomes large, network gets slow, and app feels heavy.

Pagination helps by loading fixed chunks like 20 at a time. Good for performance but user needs next page requests.

Caching helps if same data is requested again and again. It reduces DB load, but cache can become slightly old.

Lazy loading means load first few notifications and fetch more only when user scrolls. Better UX and less initial load, but needs extra frontend handling.

## Stage 5
In `notify_all` style loop, common problems are: one by one sending is slow, if one send fails the flow can break, and no retry means lost notifications.

Better approach is queue-based async processing. We push jobs to queue, worker sends notifications, and failed jobs are retried.

Simple pseudocode:

```text
function notify_all(studentList, message):
		for each student in studentList:
				queue.push({ studentId: student.id, message: message, retryCount: 0 })

worker process:
		while true:
				job = queue.pop()
				if job is empty:
						continue

				success = send_notification(job.studentId, job.message)

				if success is false and job.retryCount < 3:
						job.retryCount = job.retryCount + 1
						queue.push(job)
```

## Stage 6
For priority inbox, I wrote a small script in `priority_inbox.js`.

Logic used:
- Fetch notifications API with Bearer token
- Priority order: Placement > Result > Event
- If same priority, latest timestamp first
- Return top 10 and print in console
