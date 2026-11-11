"""One-off import of the family's legacy Excel workbook into the rental schema.

Usage: python3 -I scripts/import_excel.py <workbook.xlsx> > /tmp/rental-import.sql
The output contains tenants' personal data: never commit it. Needs openpyxl.
All imported expenses are marked settled (they are green = paid in the workbook).
"""
import datetime
import sys

import openpyxl

MEMBERS = {'איתי', 'עופר', 'איה', 'לינה'}
# workbook row label -> (app name, area, contract end, check depositor)
APTS = {
    'דירת חדר יפו': ('יפו - דירת חדר', 18, '2026-10-31', 'עופר'),
    'דירת 2 חדרים יפו': ('יפו - 2 חדרים', 28, '2025-11-30', 'איתי'),
    'דירת 3 חדרים יפו': ('יפו - 3 חדרים', None, '2026-03-31', 'איה'),
    'דירת 3 חדרים פתח תקווה': ('פתח תקווה - 3 חדרים', None, '2025-12-31', 'עופר'),
}


def q(v):
    if v is None or v == '':
        return 'null'
    if isinstance(v, float) and v.is_integer():
        v = int(v)
    if isinstance(v, (int, float)):
        return str(v)
    return "'" + str(v).strip().strip('״"').replace("'", "''") + "'"


def member(name):
    return f"(select id from members where name = {q(name)})"


def apt(name):
    return f"(select id from apartments where name = {q(name)})" if name else 'null'


def guess_apartment(text):
    """ponytail: keyword heuristic over free-text descriptions; unknown -> null (building-wide)."""
    t = text.replace('"', '').replace('״', '')
    if 'פתח תקווה' in t or 'חן' in t:
        return 'פתח תקווה - 3 חדרים'
    if '3 חדרים' in t or 'שחר' in t or 'אודיה' in t:
        return 'יפו - 3 חדרים'
    if '2 חדרים' in t or 'אוהד' in t:
        return 'יפו - 2 חדרים'
    if 'חדר' in t or 'יונתן' in t:
        return 'יפו - דירת חדר'
    return None


def category(text):
    return 'ביטוח' if 'ביטוח' in text or 'פניקס' in text else 'מיסים' if 'ארנונה' in text else 'שוטף'


def expense(date, desc, amount, payer, apartment, cat):
    return (f"insert into expenses (date, description, category, apartment_id, amount, paid_by, settled) values "
            f"({q(date)}, {q(desc)}, {q(cat)}, {apt(apartment)}, {amount}, {member(payer)}, true);")


def apartments(ws):
    rows = [r for r in ws.iter_rows(values_only=True)]
    out, tenants = [], []
    for i, r in enumerate(rows):
        if r[0] not in APTS:
            continue
        name, area, end, dep = APTS[r[0]]
        notes = 'כספי הפיקדון יחולקו בין כולם' if 'פתח' in name else None
        out.append("insert into apartments (name, address, area_sqm, rent, contract_end, deposit_member_id, electricity_contract, "
                   "electricity_meter, arnona_account, arnona_contract, water_company, water_account, property_tax_no, notes) values ("
                   + ', '.join([q(name), q(r[1]), q(area), q(r[2]), q(end), member(dep)] + [q(v) for v in r[3:10]] + [q(notes)]) + ');')
        for t in (r, rows[i + 1]):  # tenant sits on the apartment row or the line under it
            if t[10]:
                tenants.append(f"insert into tenants (apartment_id, name, phone, id_number, email) values "
                               f"({apt(name)}, {q(t[10])}, {q(t[11])}, {q(t[12])}, {q(t[13])});")
    return out + tenants


def ongoing(ws):
    out = []
    for r in list(ws.iter_rows(values_only=True))[1:]:
        if not r[0] or not r[2]:
            continue
        d, m, y = (int(x) for x in str(r[0]).strip().split('.'))
        out.append(expense(datetime.date(y, m, d).isoformat(), r[1].strip(), r[2], r[3].strip(), guess_apartment(r[1]), category(r[1])))
    return out


def renovation(ws):
    out, section = [], None
    for r in ws.iter_rows(values_only=True):
        label = (r[0] or '').strip()
        if label.startswith('שיפוץ דירת'):
            section = 'יפו - 2 חדרים' if '2' in label else 'יפו - דירת חדר'
        elif label.startswith('סה"כ'):
            section = None
        payer = (r[4] or '').strip() if isinstance(r[4], str) else ''
        if label and isinstance(r[2], (int, float)) and payer in MEMBERS:
            # No dates in this sheet: pinned to 2024-01-01 and flagged in the description.
            out.append(expense('2024-01-01', f'שיפוץ: {label} (תאריך משוער)', r[2], payer, section, 'שיפוץ'))
    return out


TASKS = [
    "insert into tasks (title, apartment_id, due_date, interval_months) values ('חידוש ביטוח דירה פתח תקווה', (select id from apartments where name = 'פתח תקווה - 3 חדרים'), '2027-04-06', 12);",
    "insert into tasks (title, due_date, interval_months) values ('חידוש ביטוח דירות יפו', '2027-06-02', 12);",
]


def main(path):
    wb = openpyxl.load_workbook(path, data_only=True)
    sheets = {ws.title.strip(): ws for ws in wb}
    lines = ['set search_path to rental, public;', 'begin;']
    lines += apartments(sheets['פרטי דירות']) + ongoing(sheets['הוצאות שוטפות']) + renovation(sheets['שיפוץ']) + TASKS
    print('\n'.join(lines + ['commit;']))


if __name__ == '__main__':
    main(sys.argv[1])
