from bunkering.pdf import GREEN, MUTED, NAVY, PAGE_HEIGHT, PAGE_WIDTH, SLATE, WHITE, PdfPage


def _label_value(page, x, y, label, value, *, size=9):
    page.text(x, y, label.upper(), size=6, font="F2", colour=SLATE)
    page.text(x, y - 14, value or "Not provided", size=size, font="F2", colour=NAVY)


def _section(page, y, number, title):
    page.rectangle(42, y - 3, 4, 18, fill=GREEN)
    page.text(56, y, f"{number:02d}", size=8, font="F2", colour=GREEN)
    page.text(78, y, title.upper(), size=9, font="F2", colour=NAVY)
    page.line(min(360, 98 + len(title) * 5.2), y + 3, 553, y + 3)


def _draw_qr(page, matrix, x, y, size):
    count = len(matrix)
    module = size / count
    page.rectangle(x - 4, y - 4, size + 8, size + 8, fill=WHITE)
    for row, values in enumerate(matrix):
        for column, filled in enumerate(values):
            if filled:
                page.rectangle(x + column * module, y + (count - row - 1) * module, module + 0.1, module + 0.1, fill=NAVY)


def _build_document(page):
    stream = "\n".join(page.commands).encode("ascii")
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>",
        b"<< /Length " + str(len(stream)).encode("ascii") + b" >>\nstream\n" + stream + b"\nendstream",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    ]
    document = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    offsets = [0]
    for number, obj in enumerate(objects, 1):
        offsets.append(len(document))
        document.extend(f"{number} 0 obj\n".encode("ascii"))
        document.extend(obj)
        document.extend(b"\nendobj\n")
    xref = len(document)
    document.extend(f"xref\n0 {len(objects) + 1}\n".encode("ascii"))
    document.extend(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        document.extend(f"{offset:010d} 00000 n \n".encode("ascii"))
    document.extend(f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode("ascii"))
    return bytes(document)


def render_delivery_pdf(data):
    page = PdfPage()
    page.rectangle(0, 717, PAGE_WIDTH, 125, fill=NAVY)
    page.rectangle(0, 711, PAGE_WIDTH, 6, fill=GREEN)
    page.rectangle(42, 786, 28, 28, fill=GREEN)
    page.text(50, 795, "PL", size=10, font="F2", colour=WHITE)
    page.text(80, 802, "PetroLedger", size=13, font="F2", colour=WHITE)
    page.text(80, 787, "CONTROLLED ROAD DELIVERY RECORD", size=6, font="F2", colour=(0.65, 0.72, 0.80))
    page.text(42, 744, "PROOF OF DELIVERY", size=22, font="F2", colour=WHITE)
    page.right_text(553, 798, "CLOSED", size=8, font="F2", colour=GREEN)
    page.right_text(553, 778, data["waybill"], size=11, font="F2", colour=WHITE)
    page.right_text(553, 762, data["closed_at"], size=7, colour=(0.72, 0.78, 0.84))

    _section(page, 680, 1, "Route and assignment")
    page.rectangle(42, 584, 511, 76, fill=MUTED)
    _label_value(page, 58, 638, "Customer", data["customer"])
    _label_value(page, 300, 638, "Dispatch reference", data["reference"])
    _label_value(page, 58, 606, "Origin", data["origin"], size=8)
    _label_value(page, 300, 606, "Destination", data["destination"], size=8)

    _section(page, 558, 2, "Vehicle and cargo")
    _label_value(page, 42, 530, "Truck / trailer", f"{data['truck']} / {data['trailer']}")
    _label_value(page, 300, 530, "Driver", data["driver"])
    page.rectangle(42, 448, 244, 58, fill=NAVY)
    page.text(58, 486, "DELIVERED QUANTITY", size=7, font="F2", colour=(0.65, 0.72, 0.80))
    page.text(58, 461, data["delivered_quantity"], size=18, font="F2", colour=WHITE)
    page.rectangle(300, 448, 253, 58, fill=(0.91, 0.98, 0.96), stroke=(0.75, 0.92, 0.86))
    page.text(316, 486, "PRODUCT / PLANNED", size=7, font="F2", colour=SLATE)
    page.text(316, 466, data["product"], size=11, font="F2", colour=NAVY)
    page.text(316, 453, data["planned_quantity"], size=7, colour=SLATE)

    _section(page, 414, 3, "Weighbridge record")
    for index, (label, value) in enumerate((("TARE", data["tare"]), ("GROSS", data["gross"]), ("NET", data["net"]))):
        x = 42 + index * 170
        page.rectangle(x, 348, 157, 46, fill=MUTED)
        page.text(x + 12, 378, label, size=6, font="F2", colour=SLATE)
        page.text(x + 12, 359, value, size=11, font="F2", colour=NAVY)
    page.text(42, 333, "Readings entered manually; no external weighbridge integration was used.", size=7, font="F2", colour=SLATE)

    _section(page, 306, 4, "Discharge and acknowledgement")
    _label_value(page, 42, 278, "Ullage", data["ullage"])
    _label_value(page, 170, 278, "Temperature", data["temperature"])
    _label_value(page, 300, 278, "Water-paste test", data["water_test"])
    page.rectangle(42, 192, 371, 53, fill=WHITE, stroke=(0.84, 0.87, 0.90))
    page.text(58, 226, "RECEIVER ACKNOWLEDGEMENT", size=7, font="F2", colour=GREEN)
    page.text(58, 208, f"{data['receiver']} - {data['receiver_title']}", size=9, font="F2", colour=NAVY)
    page.text(58, 197, data["acknowledged_at"], size=6, colour=SLATE)
    _draw_qr(page, data["qr_matrix"], 454, 185, 78)
    page.text(457, 174, "VERIFY RECORD", size=6, font="F2", colour=SLATE)

    _section(page, 151, 5, "Document control")
    _label_value(page, 42, 123, "Record ID", data["record_id"], size=7)
    page.text(42, 86, "Generated from a closed, immutable HaulTrac delivery record.", size=7, colour=SLATE)
    page.text(42, 72, "Receiver acknowledgement is an operational acknowledgement, not a cryptographic signature.", size=7, font="F2", colour=SLATE)

    page.rectangle(0, 0, PAGE_WIDTH, 52, fill=NAVY)
    page.text(42, 29, "PetroLedger Energy OS", size=8, font="F2", colour=WHITE)
    page.text(390, 29, f"E-WAYBILL {data['waybill']}", size=7, colour=(0.65, 0.72, 0.80))
    return _build_document(page)
