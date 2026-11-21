-- Special payments: an expense can belong to only some partners (e.g. Itai paid for Lina).
alter table rental.expenses add column if not exists for_members int[];
alter table rental.expenses drop constraint if exists expenses_category_check;
alter table rental.expenses add constraint expenses_category_check
  check (category in ('שוטף','ביטוח','שיפוץ','מיסים','אחר','הוצאות נוספות'));
notify pgrst, 'reload schema';
