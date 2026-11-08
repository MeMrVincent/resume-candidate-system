-- Keep one candidate-level communication list. Imported resume communication_list
-- records are preserved with type imported_resume_note.
INSERT INTO candidate_communications (
    candidate_id,position_id,communication_date,communication_type,summary,next_follow_up_date,created_at,updated_at
)
SELECT r.candidate_id,NULL,c.communicate_time,'imported_resume_note',c.communicate_content,'',c.created_at,c.updated_at
FROM candidate_resume_communications c
JOIN candidate_resumes r ON r.id=c.resume_id;

DROP TABLE candidate_resume_communications;
