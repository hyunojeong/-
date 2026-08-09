-- "기타"로 이관되었던 과정은 전부 1:1 원데이 수업이었음이 확인되어 이름을 정정한다.
UPDATE "CourseType"
SET name = '1:1 원데이'
WHERE name = '기타'
  AND NOT EXISTS (SELECT 1 FROM "CourseType" WHERE name = '1:1 원데이');
