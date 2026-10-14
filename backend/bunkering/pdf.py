PAGE_WIDTH = 595
PAGE_HEIGHT = 842


def _pdf_text(value):
    text = str(value).encode("ascii", "replace").decode("ascii")
    return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


class PdfPage:
    def __init__(self):
        self.commands = []

    def fill(self, colour):
        self.commands.append(f"{colour[0]:.3f} {colour[1]:.3f} {colour[2]:.3f} rg")

    def stroke(self, colour):
        self.commands.append(f"{colour[0]:.3f} {colour[1]:.3f} {colour[2]:.3f} RG")

    def rectangle(self, x, y, width, height, *, fill, stroke=None):
        self.fill(fill)
        if stroke:
            self.stroke(stroke)
            self.commands.append(f"{x} {y} {width} {height} re B")
        else:
            self.commands.append(f"{x} {y} {width} {height} re f")

    def line(self, x1, y1, x2, y2, *, colour=(0.85, 0.88, 0.91), width=1):
        self.stroke(colour)
        self.commands.append(f"{width} w {x1} {y1} m {x2} {y2} l S")

    def text(self, x, y, value, *, size=9, font="F1", colour=(0.09, 0.13, 0.20)):
        self.fill(colour)
        self.commands.append(f"BT /{font} {size} Tf 1 0 0 1 {x} {y} Tm ({_pdf_text(value)}) Tj ET")

    def right_text(self, right, y, value, *, size=9, font="F1", colour=(0.09, 0.13, 0.20)):
        width = len(str(value)) * size * 0.54
        self.text(max(42, right - width), y, value, size=size, font=font, colour=colour)


NAVY = (0.043, 0.082, 0.137)
GREEN = (0.000, 0.650, 0.470)
SLATE = (0.35, 0.42, 0.52)
MUTED = (0.95, 0.96, 0.97)
WHITE = (1, 1, 1)


def _label_value(page, x, y, label, value, *, value_size=10):
    page.text(x, y, label.upper(), size=7, font="F2", colour=SLATE)
    page.text(x, y - 15, value or "Not provided", size=value_size, font="F2", colour=NAVY)


def _section_title(page, y, title, number):
    page.rectangle(42, y - 3, 4, 18, fill=GREEN)
    page.text(56, y, f"{number:02d}", size=8, font="F2", colour=GREEN)
    page.text(78, y, title.upper(), size=9, font="F2", colour=NAVY)
    line_start = min(360, 98 + len(title) * 5.2)
    page.line(line_start, y + 3, 553, y + 3)


def render_bdn_pdf(data):
    page = PdfPage()
    page.rectangle(0, 717, PAGE_WIDTH, 125, fill=NAVY)
    page.rectangle(0, 711, PAGE_WIDTH, 6, fill=GREEN)
    page.rectangle(42, 786, 28, 28, fill=GREEN)
    page.text(50, 795, "PL", size=10, font="F2", colour=WHITE)
    page.text(80, 802, "PetroLedger", size=13, font="F2", colour=WHITE)
    page.text(80, 787, "ENERGY OPERATIONS RECORD", size=6, font="F2", colour=(0.65, 0.72, 0.80))
    page.text(42, 744, "BUNKER DELIVERY NOTE", size=22, font="F2", colour=WHITE)
    page.right_text(553, 798, "ISSUED", size=8, font="F2", colour=GREEN)
    page.right_text(553, 778, data["bdn_number"], size=11, font="F2", colour=WHITE)
    page.right_text(553, 762, data["issued_at"], size=7, colour=(0.72, 0.78, 0.84))

    _section_title(page, 680, "Delivery parties and vessel", 1)
    page.rectangle(42, 582, 511, 77, fill=MUTED)
    _label_value(page, 58, 638, "Supplier", data["supplier"])
    _label_value(page, 300, 638, "Customer", data["customer"])
    _label_value(page, 58, 606, "Receiving vessel", data["vessel"])
    _label_value(page, 300, 606, "IMO number", data["imo_number"])

    _section_title(page, 558, "Delivery details", 2)
    _label_value(page, 42, 530, "Port / location", data["location"])
    _label_value(page, 300, 530, "Product grade", data["product_grade"])
    page.rectangle(42, 448, 244, 58, fill=NAVY)
    page.text(58, 486, "DELIVERED QUANTITY", size=7, font="F2", colour=(0.65, 0.72, 0.80))
    page.text(58, 461, data["delivered_quantity"], size=18, font="F2", colour=WHITE)
    page.rectangle(300, 448, 253, 58, fill=(0.91, 0.98, 0.96), stroke=(0.75, 0.92, 0.86))
    page.text(316, 486, "SOURCE NOMINATION", size=7, font="F2", colour=SLATE)
    page.text(316, 463, data["nomination"], size=12, font="F2", colour=NAVY)

    _section_title(page, 414, "Fuel quality declaration", 3)
    qualities = (("FLASHPOINT", data["flashpoint"]), ("VISCOSITY", data["viscosity"]), ("SULPHUR", data["sulphur"]), ("WATER", data["water"]))
    for index, (label, value) in enumerate(qualities):
        x = 42 + index * 128
        page.rectangle(x, 347, 119, 46, fill=MUTED)
        page.text(x + 12, 377, label, size=6, font="F2", colour=SLATE)
        page.text(x + 12, 358, value, size=11, font="F2", colour=NAVY)

    _section_title(page, 313, "Electronic acknowledgements", 4)
    page.rectangle(42, 231, 244, 61, fill=WHITE, stroke=(0.84, 0.87, 0.90))
    page.text(58, 274, "SUPPLIER", size=7, font="F2", colour=GREEN)
    page.text(58, 254, data["supplier_acknowledged_by"], size=10, font="F2", colour=NAVY)
    page.text(58, 239, data["supplier_acknowledged_at"], size=7, colour=SLATE)
    page.rectangle(300, 231, 253, 61, fill=WHITE, stroke=(0.84, 0.87, 0.90))
    page.text(316, 274, "RECEIVER / CHIEF ENGINEER", size=7, font="F2", colour=GREEN)
    page.text(316, 254, data["receiver_acknowledged_by"], size=10, font="F2", colour=NAVY)
    page.text(316, 239, data["receiver_acknowledged_at"], size=7, colour=SLATE)

    _section_title(page, 196, "Document control", 5)
    _label_value(page, 42, 168, "Approved by", data["approved_by"], value_size=8)
    _label_value(page, 220, 168, "Issued by", data["issued_by"], value_size=8)
    _label_value(page, 398, 168, "Record ID", data["record_id"], value_size=7)
    page.text(42, 122, "This document was generated from an immutable issued record in PetroLedger.", size=7, colour=SLATE)
    page.text(42, 108, "Electronic acknowledgements are not represented as cryptographic signatures.", size=7, font="F2", colour=SLATE)

    page.rectangle(0, 0, PAGE_WIDTH, 78, fill=NAVY)
    page.text(42, 48, "PetroLedger Energy OS", size=8, font="F2", colour=WHITE)
    page.text(42, 33, f"BDN {data['bdn_number']}  |  Nomination {data['nomination']}", size=7, colour=(0.65, 0.72, 0.80))
    page.text(515, 40, "PAGE 1 / 1", size=7, font="F2", colour=GREEN)

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
