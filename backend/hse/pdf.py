from io import BytesIO


def _escape(value):
    return str(value).replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def render_permit_pdf(permit):
    tests = list(permit.gas_tests.all())
    latest = tests[-1] if tests else None
    rows = [
        ("PERMIT", permit.reference), ("TYPE", permit.get_kind_display()), ("STATUS", permit.get_status_display()),
        ("WORK", permit.title), ("SITE", permit.site), ("AUTHORITY", permit.performing_authority.full_name),
        ("VALID FROM", permit.starts_at.isoformat()), ("VALID UNTIL", permit.expires_at.isoformat()),
        ("PROCEDURE", permit.procedure.name),
    ]
    if latest:
        rows += [("LATEST GAS TEST", "PASS" if latest.passed else "BLOCKED"), ("ATMOSPHERE", f"O2 {latest.oxygen_percent}% | LEL {latest.lel_percent}% | H2S {latest.h2s_ppm} ppm")]
    content = ["0.04 0.12 0.20 rg 0 700 595 142 re f", "0.00 0.75 0.55 rg 0 694 595 6 re f", "1 1 1 rg BT /F1 11 Tf 44 800 Td (OFFSHORA ENERGY OS) Tj ET", "1 1 1 rg BT /F1 24 Tf 44 756 Td (PERMIT TO WORK) Tj ET"]
    y = 655
    for label, value in rows:
        content += [f"0.94 0.96 0.98 rg 36 {y-12} 523 34 re f", f"0.18 0.30 0.42 rg BT /F1 8 Tf 48 {y+7} Td ({_escape(label)}) Tj ET", f"0.04 0.12 0.20 rg BT /F1 11 Tf 180 {y+7} Td ({_escape(value)}) Tj ET"]
        y -= 42
    content += ["0.00 0.55 0.40 rg BT /F1 8 Tf 44 60 Td (CONTROLLED SAFETY RECORD - VERIFY STATUS IN OFFSHORA) Tj ET"]
    stream = "\n".join(content).encode("latin-1", "replace")
    objects = [b"<< /Type /Catalog /Pages 2 0 R >>", b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>", b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>", b"<< /Length %d >>\nstream\n" % len(stream) + stream + b"\nendstream", b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>"]
    output = BytesIO(); output.write(b"%PDF-1.4\n"); offsets = [0]
    for index, obj in enumerate(objects, 1):
        offsets.append(output.tell()); output.write(f"{index} 0 obj\n".encode() + obj + b"\nendobj\n")
    xref = output.tell(); output.write(f"xref\n0 {len(objects)+1}\n0000000000 65535 f \n".encode())
    for offset in offsets[1:]: output.write(f"{offset:010d} 00000 n \n".encode())
    output.write(f"trailer << /Size {len(objects)+1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF".encode())
    return output.getvalue()
